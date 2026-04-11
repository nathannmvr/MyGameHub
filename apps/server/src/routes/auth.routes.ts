import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { rateLimiter } from "../middleware/rate-limiter.js";
import { requireAuth } from "../middleware/auth.js";
import { ForgotPasswordSchema, LoginSchema, RegisterSchema } from "../schemas/auth.schema.js";
import { forgotPassword, login, logout, me, register } from "../controllers/auth.controller.js";

export const authRouter: ReturnType<typeof Router> = Router();

const authRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: "Too many auth attempts. Please try again in a minute.",
});

authRouter.post("/register", authRateLimiter, validate(RegisterSchema), register);
authRouter.post("/login", authRateLimiter, validate(LoginSchema), login);
authRouter.post("/forgot-password", authRateLimiter, validate(ForgotPasswordSchema), forgotPassword);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", me);
