import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_USER') &&
        this.config.get<string>('SMTP_PASS'),
    );
  }

  async send(options: SendMailOptions) {
    const requestId = options.requestId ?? this.createRequestId();
    const startedAt = Date.now();
    if (!this.isConfigured()) {
      this.logger.warn(`[${requestId}] mail.send.notConfigured to=${this.maskEmail(options.to)}`);
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    try {
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

  private createRequestId() {
    return `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'invalid-email';
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
