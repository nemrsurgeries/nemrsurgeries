import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    console.info(
      [
        "──────────────────────────────────────────────────────────",
        `[EmailService:console] To: ${message.to}`,
        `Subject: ${message.subject}`,
        message.text,
        "──────────────────────────────────────────────────────────",
      ].join("\n"),
    );
  }
}

class ResendEmailService implements EmailService {
  private client: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }
  }
}

let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (emailServiceInstance) return emailServiceInstance;

  const provider = process.env.EMAIL_PROVIDER ?? "console";
  const from = process.env.EMAIL_FROM ?? "OrthoCase <noreply@example.com>";
  const apiKey = process.env.RESEND_API_KEY;

  if (provider === "resend" && apiKey) {
    emailServiceInstance = new ResendEmailService(apiKey, from);
  } else {
    emailServiceInstance = new ConsoleEmailService();
  }

  return emailServiceInstance;
}

export function setEmailServiceForTesting(service: EmailService | null): void {
  emailServiceInstance = service;
}
