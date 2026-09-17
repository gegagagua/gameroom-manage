import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppConfig } from '../config/app-config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: AppConfig) {
    const { host, port, user, pass } = config.smtp;
    this.transporter = host
      ? nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined })
      : null;
  }

  async sendPasswordReset(to: string, name: string, link: string) {
    const subject = 'პაროლის აღდგენა / Password reset';
    const text =
      `გამარჯობა ${name},\n\nპაროლის აღსადგენად გადადით ბმულზე (ვალიდურია 1 საათ):\n${link}\n\n` +
      `Hello ${name},\n\nTo reset your password open this link (valid for 1 hour):\n${link}\n\n` +
      `If you did not request this, ignore this email.`;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — password reset link for ${to}: ${link}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.config.smtp.from, to, subject, text });
    } catch (err) {
      // Never leak mail failures to the caller (would reveal which emails exist).
      this.logger.error(`Failed to send reset email to ${to}: ${(err as Error).message}`);
    }
  }
}
