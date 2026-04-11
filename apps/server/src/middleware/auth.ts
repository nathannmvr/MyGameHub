import { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env.js";
import { AppError } from "./error-handler.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

export interface AuthContext {
  userId: string;
  sessionId: string;
}

export type AuthenticatedRequest = Request & { auth: AuthContext };

export function getAuthContext(req: Request): AuthContext {
  const auth = (req as Partial<AuthenticatedRequest>).auth;

  if (!auth) {
    throw new AppError("UNAUTHORIZED", "Authentication is required", 401);
  }

  return auth;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const env = getEnv();
    const sessionToken = req.cookies?.[env.SESSION_COOKIE_NAME];

    if (!sessionToken) {
      throw new AppError("UNAUTHORIZED", "Authentication is required", 401);
    }

    const session = await authService.getSessionByToken(sessionToken);

    if (!session) {
      throw new AppError("UNAUTHORIZED", "Session expired or invalid", 401);
    }

    (req as AuthenticatedRequest).auth = {
      userId: session.user.id,
      sessionId: session.sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
}
