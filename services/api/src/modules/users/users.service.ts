import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { UpdateLimitsDto } from './dto/update-limits.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getMe(userId: string) {
    const result = await this.db.query(
      `
      select
        p.*,
        coalesce(json_agg(r.name) filter (where r.name is not null), '[]') as roles,
        exists(select 1 from terms_acceptance ta where ta.user_id = p.id) as terms_accepted,
        (
          p.username is not null
          and p.email is not null
          and p.full_name is not null
          and p.birth_date is not null
          and p.phone is not null
          and p.is_adult_verified = true
          and exists(select 1 from terms_acceptance ta where ta.user_id = p.id)
        ) as profile_completed
      from profiles p
      left join user_roles ur on ur.user_id = p.id
      left join roles r on r.id = ur.role_id
      where p.id = $1
      group by p.id
      `,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async updateProfile(userId: string, email: string | undefined, dto: UpdateProfileDto) {
    const result = await this.db.query(
      `
      insert into profiles(id, username, email, full_name, birth_date, phone, is_adult_verified)
      values (
        $1,
        coalesce($2, split_part($6, '@', 1)),
        $6,
        $3,
        $4,
        $5,
        case when $4::date is not null then $4::date <= (current_date - interval '18 years') else false end
      )
      on conflict (id) do update
      set username = coalesce(excluded.username, profiles.username),
          email = coalesce(excluded.email, profiles.email),
          full_name = coalesce(excluded.full_name, profiles.full_name),
          birth_date = coalesce(excluded.birth_date, profiles.birth_date),
          phone = coalesce(excluded.phone, profiles.phone),
          is_adult_verified = case
            when excluded.birth_date is not null then excluded.birth_date <= (current_date - interval '18 years')
            else profiles.is_adult_verified
          end,
          updated_at = now()
      returning *
      `,
      [userId, dto.username, dto.fullName, dto.birthDate, dto.phone, email ?? `${userId}@local.invalid`],
    );
    return result.rows[0];
  }

  async acceptTerms(userId: string, dto: AcceptTermsDto, ip?: string, userAgent?: string) {
    const result = await this.db.query(
      `
      insert into terms_acceptance(user_id, terms_version, ip_address, user_agent)
      values ($1, $2, $3::inet, $4)
      on conflict (user_id, terms_version) do update
      set accepted_at = now(), ip_address = excluded.ip_address, user_agent = excluded.user_agent
      returning *
      `,
      [userId, dto.termsVersion, ip ?? null, userAgent ?? null],
    );
    return result.rows[0];
  }

  async getLimits(userId: string) {
    await this.db.query(
      `
      insert into responsible_gaming_limits(user_id)
      values ($1)
      on conflict (user_id) do nothing
      `,
      [userId],
    );
    const result = await this.db.query(
      `select * from responsible_gaming_limits where user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async updateLimits(userId: string, dto: UpdateLimitsDto) {
    const result = await this.db.query(
      `
      insert into responsible_gaming_limits(user_id, daily_limit, weekly_limit, monthly_limit)
      values ($1, $2, $3, $4)
      on conflict (user_id) do update
      set daily_limit = excluded.daily_limit,
          weekly_limit = excluded.weekly_limit,
          monthly_limit = excluded.monthly_limit,
          updated_at = now()
      returning *
      `,
      [userId, dto.dailyLimit, dto.weeklyLimit, dto.monthlyLimit],
    );
    return result.rows[0];
  }
}
