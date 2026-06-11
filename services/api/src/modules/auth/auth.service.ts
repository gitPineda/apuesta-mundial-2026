import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SmtpMailService } from './smtp-mail.service';

interface AppJwtPayload {
  sub: string;
  email: string;
  roles: string[];
  sid: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
    private readonly mail: SmtpMailService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.query(
      `
      select
        bool_or(lower(email) = lower($1)) as email_exists,
        bool_or(lower(username) = lower($2)) as username_exists
      from profiles
      where lower(email) = lower($1)
         or lower(username) = lower($2)
      `,
      [dto.email, dto.username],
    );
    const duplicate = existing.rows[0];
    if (duplicate?.email_exists && duplicate?.username_exists) {
      throw new ConflictException('El correo y el usuario ya estan registrados.');
    }
    if (duplicate?.email_exists) {
      throw new ConflictException('El correo ya esta registrado.');
    }
    if (duplicate?.username_exists) {
      throw new ConflictException('El usuario ya esta registrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const confirmationCode = this.generateCode();

    const result = await this.db.query(
      `
      insert into profiles(
        id,
        username,
        email,
        full_name,
        phone,
        password_hash,
        email_confirmation_code,
        email_confirmation_sent_at
      )
      values (gen_random_uuid(), $1, lower($2), $3, $4, $5, $6, now())
      returning id, username, email, full_name, phone, email_confirmed, created_at
      `,
      [dto.username, dto.email, dto.fullName, dto.phone, passwordHash, confirmationCode],
    );

    const user = result.rows[0];
    await this.assignDefaultRole(user.id);

    return {
      user,
      message: 'Cuenta creada. En MVP el codigo de confirmacion queda disponible para integracion SMTP.',
      confirmationCode,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    await this.assertRateLimit(
      'login',
      email,
      Number(this.config.get<string>('AUTH_LOGIN_MAX_ATTEMPTS', '5')),
      Number(this.config.get<string>('AUTH_LOGIN_WINDOW_MINUTES', '15')),
    );
    const result = await this.db.query(
      `select * from profiles where lower(email) = lower($1) limit 1`,
      [email],
    );
    const user = result.rows[0];
    if (!user?.password_hash) {
      await this.recordRateLimitAttempt(
        'login',
        email,
        Number(this.config.get<string>('AUTH_LOGIN_MAX_ATTEMPTS', '5')),
        Number(this.config.get<string>('AUTH_LOGIN_WINDOW_MINUTES', '15')),
        Number(this.config.get<string>('AUTH_LOGIN_BLOCK_MINUTES', '15')),
      );
      await this.logSecurityEvent('auth.login.failed', 'login', email, { reason: 'user_not_found_or_no_password' });
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password_hash);
    if (!validPassword) {
      await this.recordRateLimitAttempt(
        'login',
        email,
        Number(this.config.get<string>('AUTH_LOGIN_MAX_ATTEMPTS', '5')),
        Number(this.config.get<string>('AUTH_LOGIN_WINDOW_MINUTES', '15')),
        Number(this.config.get<string>('AUTH_LOGIN_BLOCK_MINUTES', '15')),
      );
      await this.logSecurityEvent('auth.login.failed', 'login', email, { reason: 'invalid_password', userId: user.id });
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const roles = await this.getRoles(user.id);
    const isAdmin = this.hasAdminRole(roles);
    if (
      !isAdmin &&
      user.active_session_id &&
      user.active_session_expires_at &&
      new Date(user.active_session_expires_at).getTime() > Date.now()
    ) {
      throw new ConflictException(
        'Ya existe una sesion activa para este usuario. Cierra la sesion anterior antes de ingresar en otro dispositivo.',
      );
    }

    const sessionId = randomUUID();
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '7d');
    await this.db.query(
      `
      update profiles
      set active_session_id = $2,
          active_session_started_at = now(),
          active_session_expires_at = now() + $3::interval
      where id = $1
      `,
      [user.id, sessionId, this.toPostgresInterval(expiresIn)],
    );
    await this.clearRateLimit('login', email);

    const accessToken = await this.signToken({
      sub: user.id,
      email: user.email,
      roles,
      sid: sessionId,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
      },
    };
  }

  async logout(userId: string, sessionId?: string) {
    if (!sessionId) {
      return { message: 'Sesion cerrada.' };
    }

    await this.db.query(
      `
      update profiles
      set active_session_id = null,
          active_session_started_at = null,
          active_session_expires_at = null
      where id = $1
        and active_session_id = $2
      `,
      [userId, sessionId],
    );
    return { message: 'Sesion cerrada.' };
  }

  async forgotPassword(dto: ForgotPasswordDto, requestId = this.createRequestId()) {
    const startedAt = Date.now();
    const email = dto.email.trim().toLowerCase();
    await this.assertRateLimit(
      'forgot_password',
      email,
      Number(this.config.get<string>('AUTH_FORGOT_PASSWORD_MAX_REQUESTS', '3')),
      Number(this.config.get<string>('AUTH_FORGOT_PASSWORD_WINDOW_MINUTES', '15')),
    );
    await this.recordRateLimitAttempt(
      'forgot_password',
      email,
      Number(this.config.get<string>('AUTH_FORGOT_PASSWORD_MAX_REQUESTS', '3')),
      Number(this.config.get<string>('AUTH_FORGOT_PASSWORD_WINDOW_MINUTES', '15')),
      Number(this.config.get<string>('AUTH_FORGOT_PASSWORD_BLOCK_MINUTES', '15')),
    );
    await this.logSecurityEvent('auth.forgot_password.requested', 'forgot_password', email);
    this.logger.log(
      `[${requestId}] auth.forgotPassword.start email=${this.maskEmail(email)}`,
    );
    const code = this.generateCode();
    const ttl = Number(this.config.get<string>('PASSWORD_RESET_CODE_TTL_MINUTES', '15'));
    const result = await this.db.query(
      `
      update profiles
      set password_reset_code = $2,
          password_reset_expires_at = now() + ($3 || ' minutes')::interval,
          password_reset_attempts = 0
      where lower(email) = lower($1)
      `,
      [email, code, ttl],
    );
    this.logger.log(
      `[${requestId}] auth.forgotPassword.dbUpdated email=${this.maskEmail(email)} rowCount=${result.rowCount}`,
    );

    if (result.rowCount) {
      this.logger.log(
        `[${requestId}] auth.forgotPassword.smtpStart email=${this.maskEmail(email)}`,
      );
      const emailResult = await this.mail.sendPasswordResetCode(email, code, ttl, requestId);
      this.logger.log(
        `[${requestId}] auth.forgotPassword.smtpResult email=${this.maskEmail(email)} sent=${emailResult.sent} reason=${emailResult.reason ?? 'none'} elapsedMs=${Date.now() - startedAt}`,
      );
      if (!emailResult.sent) {
        return {
          message: 'Si el email existe, no pudimos enviar el codigo en este momento.',
          emailSent: false,
        };
      }
    }

    this.logger.log(
      `[${requestId}] auth.forgotPassword.done email=${this.maskEmail(email)} emailSent=${Boolean(result.rowCount)} elapsedMs=${Date.now() - startedAt}`,
    );
    return {
      message: 'Si el email existe, enviaremos un codigo de recuperacion.',
      emailSent: Boolean(result.rowCount),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    await this.assertRateLimit(
      'reset_password',
      email,
      Number(this.config.get<string>('AUTH_RESET_PASSWORD_MAX_ATTEMPTS', '5')),
      Number(this.config.get<string>('AUTH_RESET_PASSWORD_WINDOW_MINUTES', '15')),
    );
    const result = await this.db.query(
      `
      select id, password_reset_code, password_reset_expires_at, password_reset_attempts
      from profiles
      where lower(email) = lower($1)
      limit 1
      `,
      [email],
    );
    const user = result.rows[0];
    if (
      !user ||
      user.password_reset_code !== dto.code ||
      new Date(user.password_reset_expires_at).getTime() < Date.now() ||
      Number(user.password_reset_attempts) >= Number(this.config.get<string>('PASSWORD_RESET_MAX_ATTEMPTS', '5'))
    ) {
      await this.recordRateLimitAttempt(
        'reset_password',
        email,
        Number(this.config.get<string>('AUTH_RESET_PASSWORD_MAX_ATTEMPTS', '5')),
        Number(this.config.get<string>('AUTH_RESET_PASSWORD_WINDOW_MINUTES', '15')),
        Number(this.config.get<string>('AUTH_RESET_PASSWORD_BLOCK_MINUTES', '15')),
      );
      await this.logSecurityEvent('auth.reset_password.failed', 'reset_password', email, {
        reason: 'invalid_or_expired_code',
        userId: user?.id,
      });
      if (user) {
        await this.db.query(
          `
          update profiles
          set password_reset_attempts = password_reset_attempts + 1
          where id = $1
          `,
          [user.id],
        );
      }
      throw new UnauthorizedException('Codigo invalido o expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.db.query(
      `
      update profiles
      set password_hash = $2,
          password_reset_code = null,
          password_reset_expires_at = null,
          password_reset_attempts = 0,
          active_session_id = null,
          active_session_started_at = null,
          active_session_expires_at = null
      where id = $1
      `,
      [user.id, passwordHash],
    );
    await this.clearRateLimit('reset_password', email);
    await this.logSecurityEvent('auth.reset_password.success', 'reset_password', email, { userId: user.id });

    return { message: 'Clave actualizada.' };
  }

  async validateBearerToken(token: string) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret === 'change-me-in-production') {
      throw new UnauthorizedException('JWT_SECRET debe configurarse para validar tokens.');
    }

    try {
      const payload = await this.jwt.verifyAsync<AppJwtPayload>(token, { secret });
      if (!payload.sid) {
        throw new UnauthorizedException('Sesion invalida.');
      }
      const roles = payload.roles?.length ? payload.roles : ['user'];
      const session = await this.db.query(
        `
        select active_session_id, active_session_expires_at
        from profiles
        where id = $1
          and status = 'active'
        limit 1
        `,
        [payload.sub],
      );
      const profile = session.rows[0];
      if (!profile) {
        throw new UnauthorizedException(
          'Tu sesion ya no esta activa o fue abierta en otro dispositivo. Ingresa nuevamente.',
        );
      }
      if (this.hasAdminRole(roles)) {
        return {
          id: payload.sub,
          email: payload.email,
          roles,
          sessionId: payload.sid,
        };
      }
      if (
        profile.active_session_id !== payload.sid ||
        !profile.active_session_expires_at ||
        new Date(profile.active_session_expires_at).getTime() <= Date.now()
      ) {
        throw new UnauthorizedException(
          'Tu sesion ya no esta activa o fue abierta en otro dispositivo. Ingresa nuevamente.',
        );
      }
      return {
        id: payload.sub,
        email: payload.email,
        roles,
        sessionId: payload.sid,
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async signToken(payload: AppJwtPayload) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret === 'change-me-in-production') {
      throw new UnauthorizedException('JWT_SECRET debe configurarse para emitir tokens.');
    }

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d'),
    });
  }

  private toPostgresInterval(value: string) {
    const match = value.trim().match(/^(\d+)\s*([smhd])$/i);
    if (!match) {
      return value;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const units: Record<string, string> = {
      s: 'seconds',
      m: 'minutes',
      h: 'hours',
      d: 'days',
    };
    return `${amount} ${units[unit]}`;
  }

  private async assertRateLimit(
    type: string,
    key: string,
    maxAttempts: number,
    windowMinutes: number,
  ) {
    const result = await this.db.query(
      `
      select attempts, window_started_at, blocked_until
      from auth_rate_limits
      where type = $1 and key = $2
      limit 1
      `,
      [type, key],
    );
    const row = result.rows[0];
    if (!row) return;

    if (row.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
      await this.logSecurityEvent('auth.rate_limit.blocked', type, key, {
        blockedUntil: row.blocked_until,
        attempts: Number(row.attempts),
      });
      throw new HttpException(
        'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const windowStartedAt = new Date(row.window_started_at).getTime();
    const windowMs = windowMinutes * 60 * 1000;
    if (Date.now() - windowStartedAt <= windowMs && Number(row.attempts) >= maxAttempts) {
      await this.logSecurityEvent('auth.rate_limit.blocked', type, key, {
        attempts: Number(row.attempts),
      });
      throw new HttpException(
        'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordRateLimitAttempt(
    type: string,
    key: string,
    maxAttempts: number,
    windowMinutes: number,
    blockMinutes: number,
  ) {
    await this.db.query(
      `
      insert into auth_rate_limits(type, key, attempts, window_started_at, blocked_until)
      values ($1, $2, 1, now(), null)
      on conflict (type, key) do update
      set attempts = case
            when auth_rate_limits.window_started_at < now() - ($3 || ' minutes')::interval then 1
            else auth_rate_limits.attempts + 1
          end,
          window_started_at = case
            when auth_rate_limits.window_started_at < now() - ($3 || ' minutes')::interval then now()
            else auth_rate_limits.window_started_at
          end,
          blocked_until = case
            when (
              case
                when auth_rate_limits.window_started_at < now() - ($3 || ' minutes')::interval then 1
                else auth_rate_limits.attempts + 1
              end
            ) >= $4 then now() + ($5 || ' minutes')::interval
            else auth_rate_limits.blocked_until
          end,
          updated_at = now()
      `,
      [type, key, windowMinutes, maxAttempts, blockMinutes],
    );
  }

  private async clearRateLimit(type: string, key: string) {
    await this.db.query(`delete from auth_rate_limits where type = $1 and key = $2`, [type, key]);
  }

  private async logSecurityEvent(
    action: string,
    type: string,
    key: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.audit.log({
      action,
      entityType: 'auth_rate_limits',
      entityId: undefined,
      afterData: {
        type,
        key: this.maskEmail(key),
        ...metadata,
      },
    }).catch((error) => {
      this.logger.warn(
        `auth.securityAudit.failed action=${action} reason=${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async assignDefaultRole(userId: string) {
    await this.db.query(
      `
      insert into user_roles(user_id, role_id)
      select $1, id from roles where name = 'user'
      on conflict do nothing
      `,
      [userId],
    );
  }

  private async getRoles(userId: string): Promise<string[]> {
    const result = await this.db.query<{ name: string }>(
      `
      select r.name
      from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = $1
      order by case r.name
        when 'admin' then 1
        when 'operator' then 2
        when 'user' then 3
        else 9
      end
      `,
      [userId],
    );
    return result.rows.map((row) => row.name);
  }

  private hasAdminRole(roles: string[]) {
    return roles.includes('admin');
  }

  private generateCode() {
    return randomInt(100000, 999999).toString();
  }

  private createRequestId() {
    return `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'invalid-email';
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
