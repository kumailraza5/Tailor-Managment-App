import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  return process.env["JWT_SECRET"] ?? "changeme-set-jwt-secret-in-env";
}

export interface AuthPayload {
  sub: string;
  username: string;
}

// Extend Express Request to carry the verified user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthPayload;
    }
  }
}

/**
 * Middleware: verifies `Authorization: Bearer <jwt>` header.
 * Attaches `req.authUser` on success, returns 401 on failure.
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, getJwtSecret()) as AuthPayload;
      req.authUser = payload;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

/**
 * Sign a JWT for the given username. Used in the login route.
 */
export function signToken(username: string): string {
  return jwt.sign(
    { sub: username, username } satisfies AuthPayload,
    getJwtSecret(),
    { expiresIn: "30d" },
  );
}
