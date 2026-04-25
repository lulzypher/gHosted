export type QRSessionStatus = "pending" | "authenticated" | "expired" | "invalid";

export interface QRSession {
  id: string;
  timestamp: number;
  expires: number;
  status: QRSessionStatus;
  userId?: number;
  username?: string;
}

const qrSessions = new Map<string, QRSession>();

export function getQrSession(id: string): QRSession | undefined {
  return qrSessions.get(id);
}

export function saveQrSession(session: QRSession): void {
  qrSessions.set(session.id, session);
}

/** Call once when the HTTP server starts. */
export function startQrSessionCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    qrSessions.forEach((session, id) => {
      if (session.expires < now) {
        session.status = "expired";
        if (session.expires < now - 3600000) {
          qrSessions.delete(id);
        }
      }
    });
  }, 60000);
}
