import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual, createPublicKey, verify, constants } from "crypto";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { User as DbUser, InsertUser } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

const scryptAsync = promisify(scrypt);

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const challengeStore = new Map<
  string,
  { challenge: string; createdAt: number; identifier?: string }
>();

function addChallenge(identifier?: string): { challengeId: string; challenge: string } {
  const challengeId = randomUUID();
  const challenge = randomBytes(32).toString("base64url");
  challengeStore.set(challengeId, {
    challenge,
    createdAt: Date.now(),
    identifier,
  });
  return { challengeId, challenge };
}

function consumeChallenge(challengeId: string): string | null {
  const entry = challengeStore.get(challengeId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CHALLENGE_TTL_MS) {
    challengeStore.delete(challengeId);
    return null;
  }
  challengeStore.delete(challengeId);
  return entry.challenge;
}

// RSA-PSS verification (client uses RSA-PSS with saltLength 32)
function verifyRsaPss(message: string, signatureBase64: string, publicKeyBase64: string): boolean {
  try {
    const keyBuf = Buffer.from(publicKeyBase64, "base64");
    const key = createPublicKey({ key: keyBuf, format: "der", type: "spki" });
    const msgBuf = Buffer.from(message, "utf8");
    const sigBuf = Buffer.from(signatureBase64, "base64");
    return verify(
      "RSA-SHA256",
      msgBuf,
      {
        key,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      sigBuf
    );
  } catch {
    return false;
  }
}

// Password hashing functions
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

// Register validation schema (password optional for key-only registration)
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6).optional(),
  displayName: z.string().min(2).max(50),
  bio: z.string().max(200).optional(),
  did: z.string(),
  publicKey: z.string(),
  avatarCid: z.string().optional(),
  encryptionKey: z.string().optional(),
  ipnsAddress: z.string().optional(),
  settings: z.any().optional(),
});

// Key-only register (proves key ownership via challenge)
const keyRegisterSchema = z.object({
  challengeId: z.string().uuid(),
  signature: z.string(),
  username: z.string().min(3).max(30),
  displayName: z.string().min(2).max(50),
  bio: z.string().max(200).optional(),
  did: z.string(),
  publicKey: z.string(),
  avatarCid: z.string().optional(),
});

export function setupAuth(app: Express) {
  // Create PostgreSQL session store
  const PostgresSessionStore = connectPg(session);
  
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.NODE_ENV === "production" 
      ? (process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET required in production"); })())
      : (process.env.SESSION_SECRET || "not-very-secret"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
  };

  // Initialize session and passport
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        if (!user.password) {
          return done(null, false, { message: "Password login not enabled for this account" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        
        if (!isValid) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Challenge-response auth (key-based)
  app.get("/api/auth/challenge", (req: Request, res: Response) => {
    const identifier = typeof req.query.identifier === "string" ? req.query.identifier : undefined;
    const { challengeId, challenge } = addChallenge(identifier);
    res.json({ challengeId, challenge });
  });

  app.post("/api/auth/verify", async (req: Request, res: Response, next: NextFunction) => {
    const { challengeId, publicKey, signature } = req.body;
    if (!challengeId || !publicKey || !signature) {
      return res.status(400).json({ message: "Missing challengeId, publicKey, or signature" });
    }
    const challenge = consumeChallenge(challengeId);
    if (!challenge) {
      return res.status(400).json({ message: "Challenge expired or invalid" });
    }
    if (!verifyRsaPss(challenge, signature, publicKey)) {
      return res.status(401).json({ message: "Invalid signature" });
    }
    const user = await storage.getUserByPublicKey(publicKey);
    if (!user) {
      return res.status(401).json({ message: "No account linked to this key" });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      const userResponse = { ...user, password: undefined };
      res.json(userResponse);
    });
  });

  // Key-only registration (no password, proves key ownership)
  app.post("/api/register/key", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = keyRegisterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
      }
      const data = validationResult.data;
      const challenge = consumeChallenge(data.challengeId);
      if (!challenge) {
        return res.status(400).json({ message: "Challenge expired or invalid" });
      }
      if (!verifyRsaPss(challenge, data.signature, data.publicKey)) {
        return res.status(401).json({ message: "Invalid signature – key ownership not verified" });
      }
      const existingByUsername = await storage.getUserByUsername(data.username);
      if (existingByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingByDid = await storage.getUserByDID(data.did);
      if (existingByDid) {
        return res.status(400).json({ message: "DID already registered" });
      }
      const existingByKey = await storage.getUserByPublicKey(data.publicKey);
      if (existingByKey) {
        return res.status(400).json({ message: "Public key already registered" });
      }
      const user = await storage.createUser({
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        did: data.did,
        publicKey: data.publicKey,
        avatarCid: data.avatarCid,
        password: null,
      });
      const userResponse = { ...user, password: undefined };
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error("Key registration error:", error);
      res.status(500).json({ message: "Error creating account" });
    }
  });

  // Authentication routes (password optional for backward compatibility)
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data
      const validationResult = registerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }
      
      const userData = validationResult.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password if provided (optional for key-only)
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      } else {
        (userData as Record<string, unknown>).password = null;
      }
      
      // Create user
      const user = await storage.createUser(userData as InsertUser);
      
      // Remove password from response
      const userResponse = { ...user, password: undefined };
      
      // Log user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data
      const validationResult = loginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }
      
      passport.authenticate("local", (err: Error, user: DbUser, info: any) => {
        if (err) return next(err);
        
        if (!user) {
          return res.status(401).json({ message: info.message || "Authentication failed" });
        }
        
        req.login(user, (err) => {
          if (err) return next(err);
          
          // Remove password from response
          const userResponse = { ...user, password: undefined };
          
          res.status(200).json(userResponse);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error during login" });
    }
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const user = req.user as DbUser;
    const userResponse = { ...user, password: undefined };
    
    res.status(200).json(userResponse);
  });

  // Export middleware
  return { isAuthenticated };
}