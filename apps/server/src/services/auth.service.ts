import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrismaClient } from "../config/database.js";
import { getEnv } from "../config/env.js";
import { AppError } from "../middleware/error-handler.js";
import { EmailService } from "./email.service.js";

const SESSION_EXPIRY_MS_PER_DAY = 24 * 60 * 60 * 1000;

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildSessionExpiryDate(ttlDays: number): Date {
  return new Date(Date.now() + ttlDays * SESSION_EXPIRY_MS_PER_DAY);
}

export interface AuthUserDTO {
  id: string;
  username: string;
  email: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export class AuthService {
  private readonly prisma = getPrismaClient();
  private readonly emailService = new EmailService();

  async register(input: RegisterInput): Promise<{ user: AuthUserDTO; sessionToken: string }> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true, email: true, username: true },
    });

    if (existing?.email === email) {
      throw new AppError("EMAIL_ALREADY_EXISTS", "Email already in use", 409);
    }

    if (existing?.username === username) {
      throw new AppError("USERNAME_ALREADY_EXISTS", "Username already in use", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    const sessionToken = await this.createSession(user.id);
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? email,
      },
      sessionToken,
    };
  }

  async login(input: LoginInput): Promise<{ user: AuthUserDTO; sessionToken: string }> {
    const email = input.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const sessionToken = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? email,
      },
      sessionToken,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(sessionToken),
      },
    });
  }

  async getSessionByToken(sessionToken: string): Promise<{ sessionId: string; user: AuthUserDTO } | null> {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    const session = await this.prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(sessionToken),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    if (!session.user.email) {
      return null;
    }

    return {
      sessionId: session.id,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
      },
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashSessionToken(resetToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    if (user.email) {
      await this.emailService.sendPasswordResetEmail({
        to: user.email,
        token: resetToken,
      });
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashSessionToken(input.token);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
      },
      select: {
        id: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (!user) {
      throw new AppError("INVALID_RESET_TOKEN", "Token invalido ou expirado", 400);
    }

    if (!user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        },
      });
      throw new AppError("EXPIRED_RESET_TOKEN", "Token invalido ou expirado", 400);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });
  }

  private async createSession(userId: string): Promise<string> {
    const env = getEnv();
    const sessionToken = crypto.randomBytes(48).toString("base64url");

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(sessionToken),
        expiresAt: buildSessionExpiryDate(env.SESSION_TTL_DAYS),
      },
    });

    return sessionToken;
  }
}
