import { z } from "zod";

const emailSchema = z.string().trim().email().max(255).transform((value) => value.toLowerCase());

export const RegisterSchema = z.object({
  username: z.string().trim().min(3).max(32),
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
