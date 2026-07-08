export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);

export const smtpConfig: SmtpConfig = {
  host: process.env.SMTP_HOST ?? "",
  port: Number.isNaN(port) ? 587 : port,
  secure: process.env.SMTP_SECURE === "true" || port === 465,
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
  from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@archprep.local",
};

export function hasSmtpConfig(): boolean {
  return Boolean(smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass);
}
