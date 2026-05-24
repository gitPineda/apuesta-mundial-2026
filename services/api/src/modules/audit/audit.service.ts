import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

interface AuditLogInput {
  actorUserId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(input: AuditLogInput) {
    await this.db.query(
      `
      insert into audit_logs(
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        before_data,
        after_data,
        ip_address,
        user_agent
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8::inet,$9)
      `,
      [
        input.actorUserId ?? null,
        input.actorRole ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        input.beforeData ? JSON.stringify(input.beforeData) : null,
        input.afterData ? JSON.stringify(input.afterData) : null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ],
    );
  }
}
