import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';
import * as tls from 'node:tls';

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  requestId?: string;
}

@Injectable()
export class SmtpMailService {
  private readonly logger = new Logger(SmtpMailService.name);

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
      this.logger.warn(`[${requestId}] smtp.send.notConfigured to=${this.maskEmail(options.to)}`);
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const timeoutMs = Number(this.config.get<string>('SMTP_TIMEOUT_MS', '10000'));
    const heloHost = this.hostname();
    const user = this.config.getOrThrow<string>('SMTP_USER');
    const pass = this.config.getOrThrow<string>('SMTP_PASS');
    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'Soporte');
    const from = `${fromName} <${user}>`;

    this.logger.log(
      `[${requestId}] smtp.send.start to=${this.maskEmail(options.to)} host=${host} port=${port} secure=${secure} timeoutMs=${timeoutMs} heloHost=${heloHost}`,
    );

    let socket: net.Socket | tls.TLSSocket = secure
      ? tls.connect({ host, port, servername: host, timeout: timeoutMs })
      : net.createConnection({ host, port, timeout: timeoutMs });
    this.applySocketTimeout(socket, timeoutMs, requestId);

    const reader = this.createReader(socket);
    await reader.read(timeoutMs, 'greeting');
    await this.command(socket, reader, `EHLO ${heloHost}`, timeoutMs, 'ehlo');

    if (!secure) {
      await this.command(socket, reader, 'STARTTLS', timeoutMs, 'starttls');
      socket = tls.connect({ socket, servername: host });
      this.applySocketTimeout(socket, timeoutMs, requestId);
      const tlsReader = this.createReader(socket);
      await this.command(socket, tlsReader, `EHLO ${heloHost}`, timeoutMs, 'ehlo_tls');
      await this.authenticate(socket, tlsReader, user, pass, timeoutMs);
      await this.sendEnvelope(socket, tlsReader, from, options, timeoutMs);
      this.logger.log(
        `[${requestId}] smtp.send.success to=${this.maskEmail(options.to)} elapsedMs=${Date.now() - startedAt}`,
      );
      return { sent: true };
    }

    await this.authenticate(socket, reader, user, pass, timeoutMs);
    await this.sendEnvelope(socket, reader, from, options, timeoutMs);
    this.logger.log(
      `[${requestId}] smtp.send.success to=${this.maskEmail(options.to)} elapsedMs=${Date.now() - startedAt}`,
    );
    return { sent: true };
  }

  async sendPasswordResetCode(email: string, code: string, ttlMinutes: number, requestId?: string) {
    try {
      return await this.send({
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
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'SMTP_SEND_FAILED';
      this.logger.error(`[${requestId ?? 'no-request-id'}] smtp.passwordReset.failed reason=${reason}`, error);
      return { sent: false, reason };
    }
  }

  private async authenticate(
    socket: net.Socket | tls.TLSSocket,
    reader: ReturnType<SmtpMailService['createReader']>,
    user: string,
    pass: string,
    timeoutMs: number,
  ) {
    const payload = Buffer.from(`\0${user}\0${pass}`).toString('base64');
    await this.command(socket, reader, `AUTH PLAIN ${payload}`, timeoutMs, 'auth_plain');
  }

  private async sendEnvelope(
    socket: net.Socket | tls.TLSSocket,
    reader: ReturnType<SmtpMailService['createReader']>,
    from: string,
    options: SendMailOptions,
    timeoutMs: number,
  ) {
    await this.command(socket, reader, `MAIL FROM:<${this.extractEmail(from)}>`, timeoutMs, 'mail_from');
    await this.command(socket, reader, `RCPT TO:<${options.to}>`, timeoutMs, 'rcpt_to');
    await this.command(socket, reader, 'DATA', timeoutMs, 'data');
    socket.write(`${this.formatMessage(from, options)}\r\n.\r\n`);
    await reader.read(timeoutMs, 'message_body');
    await this.command(socket, reader, 'QUIT', timeoutMs, 'quit');
    socket.end();
  }

  private async command(
    socket: net.Socket | tls.TLSSocket,
    reader: ReturnType<SmtpMailService['createReader']>,
    command: string,
    timeoutMs: number,
    stage: string,
  ) {
    socket.write(`${command}\r\n`);
    const response = await reader.read(timeoutMs, stage);
    const code = Number(response.slice(0, 3));
    if (code >= 400) {
      throw new Error(`SMTP command failed: ${command} -> ${response}`);
    }
    return response;
  }

  private createReader(socket: net.Socket | tls.TLSSocket) {
    let buffer = '';
    const waiters: Array<{ resolve: (value: string) => void; timer: NodeJS.Timeout }> = [];

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const response = this.takeCompleteResponse(buffer);
      if (!response) return;
      buffer = buffer.slice(response.length);
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(response.trim());
      }
    });

    socket.on('error', (error) => {
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(`500 ${error.message}`);
      }
    });

    return {
      read: (timeoutMs: number, stage: string) =>
        new Promise<string>((resolve) => {
          const response = this.takeCompleteResponse(buffer);
          if (response) {
            buffer = buffer.slice(response.length);
            resolve(response.trim());
            return;
          }
          const waiter = {
            resolve,
            timer: setTimeout(() => {
              const index = waiters.indexOf(waiter);
              if (index >= 0) waiters.splice(index, 1);
              resolve(`500 SMTP_READ_TIMEOUT stage=${stage}`);
            }, timeoutMs),
          };
          waiters.push(waiter);
        }),
    };
  }

  private takeCompleteResponse(buffer: string) {
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return null;
    const lastLine = lines[lines.length - 1];
    if (/^\d{3} /.test(lastLine)) {
      return `${lines.join('\r\n')}\r\n`;
    }
    return null;
  }

  private formatMessage(from: string, options: SendMailOptions) {
    const safeText = options.text.replace(/^\./gm, '..');
    return [
      `From: ${from}`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      safeText,
    ].join('\r\n');
  }

  private extractEmail(value: string) {
    const match = value.match(/<([^>]+)>/);
    return match ? match[1] : value;
  }

  private hostname() {
    return this.config.get<string>('SMTP_HELO_HOST', 'apuesta-mundial-api.onrender.com');
  }

  private applySocketTimeout(socket: net.Socket | tls.TLSSocket, timeoutMs: number, requestId: string) {
    socket.setTimeout(timeoutMs, () => {
      this.logger.error(`[${requestId}] smtp.socket.timeout timeoutMs=${timeoutMs}`);
      socket.destroy(new Error('SMTP_SOCKET_TIMEOUT'));
    });
  }

  private createRequestId() {
    return `smtp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'invalid-email';
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
