import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';
import * as tls from 'node:tls';

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
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
    if (!this.isConfigured()) {
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.config.getOrThrow<string>('SMTP_USER');
    const pass = this.config.getOrThrow<string>('SMTP_PASS');
    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'Soporte');
    const from = `${fromName} <${user}>`;

    let socket: net.Socket | tls.TLSSocket = secure
      ? tls.connect({ host, port, servername: host })
      : net.createConnection({ host, port });

    const reader = this.createReader(socket);
    await reader.read();
    await this.command(socket, reader, `EHLO ${this.hostname()}`);

    if (!secure) {
      await this.command(socket, reader, 'STARTTLS');
      socket = tls.connect({ socket, servername: host });
      const tlsReader = this.createReader(socket);
      await this.command(socket, tlsReader, `EHLO ${this.hostname()}`);
      await this.authenticate(socket, tlsReader, user, pass);
      await this.sendEnvelope(socket, tlsReader, from, options);
      return { sent: true };
    }

    await this.authenticate(socket, reader, user, pass);
    await this.sendEnvelope(socket, reader, from, options);
    return { sent: true };
  }

  async sendPasswordResetCode(email: string, code: string, ttlMinutes: number) {
    try {
      return await this.send({
        to: email,
        subject: 'Codigo de recuperacion de clave',
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
      this.logger.error('No se pudo enviar correo de recuperacion.', error);
      return { sent: false, reason: 'SMTP_SEND_FAILED' };
    }
  }

  private async authenticate(
    socket: net.Socket | tls.TLSSocket,
    reader: ReturnType<SmtpMailService['createReader']>,
    user: string,
    pass: string,
  ) {
    const payload = Buffer.from(`\0${user}\0${pass}`).toString('base64');
    await this.command(socket, reader, `AUTH PLAIN ${payload}`);
  }

  private async sendEnvelope(
    socket: net.Socket | tls.TLSSocket,
    reader: ReturnType<SmtpMailService['createReader']>,
    from: string,
    options: SendMailOptions,
  ) {
    await this.command(socket, reader, `MAIL FROM:<${this.extractEmail(from)}>`);
    await this.command(socket, reader, `RCPT TO:<${options.to}>`);
    await this.command(socket, reader, 'DATA');
    socket.write(`${this.formatMessage(from, options)}\r\n.\r\n`);
    await reader.read();
    await this.command(socket, reader, 'QUIT');
    socket.end();
  }

  private async command(
    socket: net.Socket | tls.TLSSocket,
    reader: ReturnType<SmtpMailService['createReader']>,
    command: string,
  ) {
    socket.write(`${command}\r\n`);
    const response = await reader.read();
    const code = Number(response.slice(0, 3));
    if (code >= 400) {
      throw new Error(`SMTP command failed: ${command} -> ${response}`);
    }
    return response;
  }

  private createReader(socket: net.Socket | tls.TLSSocket) {
    let buffer = '';
    const waiters: Array<(value: string) => void> = [];

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const response = this.takeCompleteResponse(buffer);
      if (!response) return;
      buffer = buffer.slice(response.length);
      const resolve = waiters.shift();
      if (resolve) resolve(response.trim());
    });

    socket.on('error', (error) => {
      const resolve = waiters.shift();
      if (resolve) resolve(`500 ${error.message}`);
    });

    return {
      read: () =>
        new Promise<string>((resolve) => {
          const response = this.takeCompleteResponse(buffer);
          if (response) {
            buffer = buffer.slice(response.length);
            resolve(response.trim());
            return;
          }
          waiters.push(resolve);
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
    return 'apuesta-mundial-mvp.local';
  }
}
