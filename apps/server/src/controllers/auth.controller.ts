import { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

function setSessionCookie(res: Response, sessionToken: string): void {
  const env = getEnv();

  res.cookie(env.SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res: Response): void {
  const env = getEnv();

  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, sessionToken } = await authService.register(req.body);
    setSessionCookie(res, sessionToken);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, sessionToken } = await authService.login(req.body);
    setSessionCookie(res, sessionToken);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const env = getEnv();
    const sessionToken = req.cookies?.[env.SESSION_COOKIE_NAME];

    if (sessionToken) {
      await authService.logout(sessionToken);
    }

    clearSessionCookie(res);

    res.json({
      success: true,
      data: {
        loggedOut: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const env = getEnv();
    const sessionToken = req.cookies?.[env.SESSION_COOKIE_NAME];

    if (!sessionToken) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required",
        },
      });
      return;
    }

    const session = await authService.getSessionByToken(sessionToken);

    if (!session) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Session expired or invalid",
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: session.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.requestPasswordReset(req.body.email);

    // Security stub: never reveal if an account exists.
    res.status(202).json({
      success: true,
      data: {
        accepted: true,
      },
    });
  } catch (error) {
    next(error);
  }
}
