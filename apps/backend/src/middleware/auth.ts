import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../lib/env";
import type { UserRole } from "@survey/shared";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET) as Partial<AuthContext>;
    if (!payload.userId || !payload.tenantId || !payload.role) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    req.auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role as UserRole,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!allowed.includes(req.auth.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
