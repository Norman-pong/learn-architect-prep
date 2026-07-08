import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { hasSmtpConfig, smtpConfig } from "./smtp.js";
import { buildVerificationCodeEmail } from "./email-template.js";

let transport: Transporter | null = null;

export function getTransport(): Transporter | null {
  if (transport) return transport;
  if (!hasSmtpConfig()) return null;

  transport = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth,
  });

  return transport;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransport();
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[SMTP 未配置] 邮件未发送");
      console.log(`收件人: ${to}`);
      console.log(`主题: ${subject}`);
      return;
    }
    throw new Error("SMTP 未配置，无法发送邮件");
  }

  await transporter.sendMail({
    from: smtpConfig.from,
    to,
    subject,
    html,
  });
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const html = buildVerificationCodeEmail(code);
  await sendEmail(email, "ArchPrep 登录验证码", html);
}
