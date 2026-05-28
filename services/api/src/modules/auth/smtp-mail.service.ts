import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { resolve4 } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createTransport, Transporter } from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  requestId?: string;
}

@Injectable()
export class SmtpMailService {
  private readonly logger = new Logger(SmtpMailService.name);
  private transporter: Transporter | null = null;
  private gmailClient: gmail_v1.Gmail | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return this.isGmailApiConfigured() || this.isSmtpConfigured();
  }

  async send(options: SendMailOptions) {
    const requestId = options.requestId ?? this.createRequestId();
    const startedAt = Date.now();
    if (!this.isConfigured()) {
      this.logger.warn(`[${requestId}] mail.send.notConfigured to=${this.maskEmail(options.to)}`);
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    try {
      if (this.isGmailApiConfigured()) {
        await this.sendWithGmailApi(options, requestId);
        this.logger.log(
          `[${requestId}] mail.send.success to=${this.maskEmail(options.to)} provider=gmailApi elapsedMs=${Date.now() - startedAt}`,
        );
        return { sent: true };
      }

      const transporter = await this.getTransporter(requestId);
      const fromName = this.config.get<string>('SMTP_FROM_NAME', 'Soporte');
      const user = this.config.getOrThrow<string>('SMTP_USER').trim().toLowerCase();
      const from = `${fromName} <${user}>`;

      this.logger.log(
        `[${requestId}] mail.send.start to=${this.maskEmail(options.to)} provider=nodemailer`,
      );
      await transporter.sendMail({
        from,
        to: options.to.trim().toLowerCase(),
        subject: options.subject,
        text: options.text,
      });
      this.logger.log(
        `[${requestId}] mail.send.success to=${this.maskEmail(options.to)} elapsedMs=${Date.now() - startedAt}`,
      );
      return { sent: true };
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.error(`[${requestId}] mail.send.failed reason=${reason}`, error);
      return { sent: false, reason };
    }
  }

  async sendPasswordResetCode(email: string, code: string, ttlMinutes: number, requestId?: string) {
    const result = await this.send({
      to: email,
      subject: 'Codigo de recuperacion de clave',
      requestId,
      text: [
        'Hola,',
        '',
        `Tu codigo de recuperacion es: ${code}`,
        `Este codigo expira en ${ttlMinutes} minutos.`,
        '',
        'Si no solicitaste este cambio, ignora este mensaje.',
      ].join('\n'),
    });

    if (!result.sent) {
      this.logger.error(
        `[${requestId ?? 'no-request-id'}] mail.passwordReset.failed reason=${result.reason}`,
      );
    }

    return result;
  }

  private async getTransporter(requestId: string) {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.getOrThrow<string>('SMTP_HOST').trim();
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.config.getOrThrow<string>('SMTP_USER').trim();
    const pass = this.config.getOrThrow<string>('SMTP_PASS').trim();
    const timeoutMs = Number(this.config.get<string>('SMTP_TIMEOUT_MS', '20000'));

    let smtpHost = host;
    let servername: string | undefined;

    if (!isIP(host)) {
      try {
        const ipv4Addresses = await resolve4(host);
        if (ipv4Addresses.length > 0) {
          smtpHost = ipv4Addresses[0];
          servername = host;
        }
      } catch (error) {
        const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        this.logger.warn(`[${requestId}] mail.smtpDnsIpv4Fallback.failed host=${host} reason=${reason}`);
      }
    }

    this.logger.log(
      `[${requestId}] mail.transporter.create host=${host} smtpHost=${smtpHost} port=${port} secure=${secure} timeoutMs=${timeoutMs}`,
    );

    this.transporter = createTransport({
      host: smtpHost,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
      tls: servername ? { servername } : undefined,
    });

    return this.transporter;
  }

  private async sendWithGmailApi(options: SendMailOptions, requestId: string) {
    const gmail = this.getGmailClient(requestId);
    const senderEmail = this.config.getOrThrow<string>('GMAIL_SENDER_EMAIL').trim().toLowerCase();
    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'Soporte');
    const from = `${this.sanitizeHeaderValue(fromName)} <${senderEmail}>`;
    const to = options.to.trim().toLowerCase();
    const raw = this.toBase64Url(
      [
        `From: ${from}`,
        `To: ${this.sanitizeHeaderValue(to)}`,
        `Subject: ${this.sanitizeHeaderValue(options.subject)}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        options.text,
      ].join('\r\n'),
    );

    this.logger.log(`[${requestId}] mail.send.start to=${this.maskEmail(to)} provider=gmailApi`);
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    this.logger.log(
      `[${requestId}] mail.gmailApi.response messageId=${result.data.id ?? 'none'} threadId=${result.data.threadId ?? 'none'}`,
    );
  }

  private getGmailClient(requestId: string) {
    if (this.gmailClient) {
      return this.gmailClient;
    }

    const clientId = this.config.getOrThrow<string>('GMAIL_CLIENT_ID').trim();
    const clientSecret = this.config.getOrThrow<string>('GMAIL_CLIENT_SECRET').trim();
    const refreshToken = this.config.getOrThrow<string>('GMAIL_REFRESH_TOKEN').trim();
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    this.gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
    this.logger.log(
      `[${requestId}] mail.gmailApi.client.create sender=${this.maskEmail(
        this.config.getOrThrow<string>('GMAIL_SENDER_EMAIL'),
      )}`,
    );
    return this.gmailClient;
  }

  private isGmailApiConfigured() {
    return Boolean(
      this.config.get<string>('GMAIL_CLIENT_ID') &&
        this.config.get<string>('GMAIL_CLIENT_SECRET') &&
        this.config.get<string>('GMAIL_REFRESH_TOKEN') &&
        this.config.get<string>('GMAIL_SENDER_EMAIL'),
    );
  }

  private isSmtpConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_USER') &&
        this.config.get<string>('SMTP_PASS'),
    );
  }

  private createRequestId() {
    return `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'invalid-email';
    return `${name.slice(0, 2)}***@${domain}`;
  }

  private sanitizeHeaderValue(value: string) {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  private toBase64Url(value: string) {
    return Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
