import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ratizon-dev-secret-change-me";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  athleteId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verify JWT from Authorization: Bearer header and attach user to req.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: { message: "Adgangstoken mangler" } });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & { iat: number; exp: number };
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      athleteId: decoded.athleteId,
    };
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: { message: "Adgangstoken udloebet" } });
      return;
    }
    res.status(401).json({ error: { message: "Ugyldig adgangstoken" } });
  }
}

/**
 * Check that the authenticated user has one of the allowed roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { message: "Ikke autentificeret" } });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: { message: "Ingen adgang - utilstraekkelig rolle" } });
      return;
    }
    next();
  };
}
