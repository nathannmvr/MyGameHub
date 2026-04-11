import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getEnv } from "../config/env.js";
import { AppError } from "../middleware/error-handler.js";

interface PasswordResetEmailInput {
  to: string;
  token: string;
}

export class EmailService {
  private transporter: Transporter | null | undefined;

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const env = getEnv();
    const transporter = this.getTransporter();

    if (!transporter) {
      return;
    }

    const resetUrl = new URL(env.SMTP_RESET_BASE_URL);
    resetUrl.searchParams.set("token", input.token);

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: "Redefinicao de senha - GameHub",
      text: [
        "Recebemos uma solicitacao para redefinir sua senha.",
        "",
        `Use este link para redefinir: ${resetUrl.toString()}`,
        "",
        "Este link expira em 60 minutos e pode ser usado apenas uma vez.",
        "Se voce nao fez essa solicitacao, ignore este email.",
      ].join("\n"),
      html: [
        "<p>Recebemos uma solicitacao para redefinir sua senha.</p>",
        `<p><a href=\"${resetUrl.toString()}\">Redefinir senha</a></p>`,
        "<p>Este link expira em 60 minutos e pode ser usado apenas uma vez.</p>",
        "<p>Se voce nao fez essa solicitacao, ignore este email.</p>",
      ].join(""),
    });
  }

  private getTransporter(): Transporter | null {
    if (this.transporter !== undefined) {
      return this.transporter;
    }

    const env = getEnv();
    const hasCredentials = Boolean(env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);

    if (!hasCredentials) {
      if (env.NODE_ENV === "production") {
        throw new AppError(
          "SMTP_NOT_CONFIGURED",
          "SMTP credentials are required in production",
          500
        );
      }
      this.transporter = null;
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    return this.transporter;
  }
}
