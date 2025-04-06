import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

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

// Register validation schema
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
  displayName: z.string().min(2).max(50),
  bio: z.string().max(200).optional(),
  did: z.string(),
  publicKey: z.string(),
  avatarCid: z.string().optional(),
  encryptionKey: z.string().optional(),
  ipnsAddress: z.string().optional(),
  settings: z.any().optional(),
});

export function setupAuth(app: Express) {
  // Create PostgreSQL session store
  const PostgresSessionStore = connectPg(session);
  
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "not-very-secret",
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

  // Authentication routes
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
      
      // Hash password
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
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
      
      passport.authenticate("local", (err: Error, user: User, info: any) => {
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
    const user = req.user as User;
    const userResponse = { ...user, password: undefined };
    
    res.status(200).json(userResponse);
  });

  // Export middleware
  return { isAuthenticated };
}