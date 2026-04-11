import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { rateLimiter } from "../middleware/rate-limiter.js";
import { requireAuth } from "../middleware/auth.js";
import { ForgotPasswordSchema, LoginSchema, RegisterSchema, ResetPasswordSchema } from "../schemas/auth.schema.js";
import { forgotPassword, login, logout, me, register, resetPassword } from "../controllers/auth.controller.js";

export const authRouter: ReturnType<typeof Router> = Router();

const authRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: "Too many auth attempts. Please try again in a minute.",
});

const forgotPasswordRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: "Too many password reset requests. Please try again soon.",
});

const resetPasswordRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: "Too many password reset attempts. Please try again soon.",
});

authRouter.post("/register", authRateLimiter, validate(RegisterSchema), register);
authRouter.post("/login", authRateLimiter, validate(LoginSchema), login);
authRouter.post("/forgot-password", forgotPasswordRateLimiter, validate(ForgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", resetPasswordRateLimiter, validate(ResetPasswordSchema), resetPassword);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", me);
