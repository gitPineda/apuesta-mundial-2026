import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SmtpMailService } from './smtp-mail.service';

interface AppJwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
    private readonly mail: SmtpMailService,
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
        password_hash,
        email_confirmation_code,
        email_confirmation_sent_at
      )
      values (gen_random_uuid(), $1, lower($2), $3, $4, now())
      returning id, username, email, email_confirmed, created_at
      `,
      [dto.username, dto.email, passwordHash, confirmationCode],
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
    const result = await this.db.query(
      `select * from profiles where lower(email) = lower($1) limit 1`,
      [dto.email],
    );
    const user = result.rows[0];
    if (!user?.password_hash) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password_hash);
    if (!validPassword) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const roles = await this.getRoles(user.id);
    const accessToken = await this.signToken({
      sub: user.id,
      email: user.email,
      roles,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d'),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
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
      [dto.email, code, ttl],
    );

    if (result.rowCount) {
      const emailResult = await this.mail.sendPasswordResetCode(dto.email, code, ttl);
      if (!emailResult.sent) {
        return {
          message: 'Si el email existe, no pudimos enviar el codigo en este momento.',
          emailSent: false,
        };
      }
    }

    return {
      message: 'Si el email existe, enviaremos un codigo de recuperacion.',
      emailSent: Boolean(result.rowCount),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const result = await this.db.query(
      `
      select id, password_reset_code, password_reset_expires_at, password_reset_attempts
      from profiles
      where lower(email) = lower($1)
      limit 1
      `,
      [dto.email],
    );
    const user = result.rows[0];
    if (
      !user ||
      user.password_reset_code !== dto.code ||
      new Date(user.password_reset_expires_at).getTime() < Date.now() ||
      Number(user.password_reset_attempts) >= Number(this.config.get<string>('PASSWORD_RESET_MAX_ATTEMPTS', '5'))
    ) {
      throw new UnauthorizedException('Codigo invalido o expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.db.query(
      `
      update profiles
      set password_hash = $2,
          password_reset_code = null,
          password_reset_expires_at = null,
          password_reset_attempts = 0
      where id = $1
      `,
      [user.id, passwordHash],
    );

    return { message: 'Clave actualizada.' };
  }

  async validateBearerToken(token: string) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret === 'change-me-in-production') {
      throw new UnauthorizedException('JWT_SECRET debe configurarse para validar tokens.');
    }

    try {
      const payload = await this.jwt.verifyAsync<AppJwtPayload>(token, { secret });
      return {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles?.length ? payload.roles : ['user'],
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

  private generateCode() {
    return randomInt(100000, 999999).toString();
  }
}
