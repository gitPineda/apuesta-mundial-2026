import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface AppVersionCheck {
  supported: boolean;
  currentVersionId: string | null;
  currentVersionName: string | null;
  currentVersionCode: number | null;
  message: string;
}

@Injectable()
export class AppVersionService {
  private readonly defaultMessage =
    'Tu version de la app esta obsoleta. Descarga e instala la nueva version para continuar.';

  constructor(private readonly db: DatabaseService) {}

  async check(platform = 'android', versionId?: string | null): Promise<AppVersionCheck> {
    const current = await this.getCurrent(platform);

    if (!versionId) {
      return {
        supported: false,
        currentVersionId: current?.version_id ?? null,
        currentVersionName: current?.version_name ?? null,
        currentVersionCode: current?.version_code ?? null,
        message: current?.force_update_message ?? this.defaultMessage,
      };
    }

    const version = await this.db.query<{
      version_id: string;
      version_name: string;
      version_code: number;
      is_current: boolean;
      is_supported: boolean;
      force_update_message: string;
    }>(
      `
      select version_id, version_name, version_code, is_current, is_supported, force_update_message
      from mobile_app_versions
      where platform = $1 and version_id = $2
      limit 1
      `,
      [platform, versionId],
    );

    const row = version.rows[0];
    const supported = Boolean(row?.is_supported && row?.is_current);

    return {
      supported,
      currentVersionId: current?.version_id ?? null,
      currentVersionName: current?.version_name ?? null,
      currentVersionCode: current?.version_code ?? null,
      message: supported ? 'Version vigente.' : current?.force_update_message ?? this.defaultMessage,
    };
  }

  private async getCurrent(platform: string) {
    const result = await this.db.query<{
      version_id: string;
      version_name: string;
      version_code: number;
      force_update_message: string;
    }>(
      `
      select version_id, version_name, version_code, force_update_message
      from mobile_app_versions
      where platform = $1 and is_current = true
      order by released_at desc
      limit 1
      `,
      [platform],
    );
    return result.rows[0] ?? null;
  }
}
