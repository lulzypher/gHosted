import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { getQrSession, saveQrSession, type QRSession } from "../qrSessions";

/**
 * QR device login: short-lived session in memory, completed when a signed-in device approves.
 * Mounted under `/api` (paths: `/qr-session`, `/qr-session/:id`, `/qr-login`).
 */
export function createQrRouter(): Router {
  const router = Router();

  router.post("/qr-session", (req: Request, res: Response) => {
    const { sessionId, expires } = req.body as { sessionId?: string; expires?: number };

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const session: QRSession = {
      id: sessionId,
      timestamp: Date.now(),
      expires: expires || Date.now() + 5 * 60 * 1000,
      status: "pending",
    };

    saveQrSession(session);
    res.status(201).json({ message: "QR session created" });
  });

  router.get("/qr-session/:sessionId", (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = getQrSession(sessionId);

    if (!session) {
      return res.status(404).json({ message: "QR session not found" });
    }

    if (session.expires < Date.now()) {
      session.status = "expired";
    }

    res.json(session);
  });

  router.post("/qr-login", async (req: Request, res: Response) => {
    const { sessionId, signature, publicKey } = req.body as {
      sessionId?: string;
      signature?: string;
      publicKey?: string;
      deviceId?: string;
    };

    if (!sessionId || !signature || !publicKey) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const session = getQrSession(sessionId);

    if (!session) {
      return res.status(404).json({ message: "QR session not found" });
    }

    if (session.status === "expired") {
      return res.status(400).json({ message: "QR session has expired" });
    }

    try {
      const user = await storage.getUserByPublicKey(publicKey);

      if (!user) {
        return res.status(401).json({ message: "Invalid public key" });
      }

      // In a full implementation, verify `signature` here before establishing the session.

      session.status = "authenticated";
      session.userId = user.id;
      session.username = user.username;

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("QR login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
}
