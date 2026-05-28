import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppVersionService } from './app-version.service';

@Injectable()
export class AppVersionMiddleware implements NestMiddleware {
  constructor(private readonly appVersion: AppVersionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const versionId = req.header('x-app-version-id');
    const platform = req.header('x-app-platform') ?? 'android';
    const result = await this.appVersion.check(platform, versionId);

    if (!result.supported) {
      res.status(426).json({
        statusCode: 426,
        code: 'APP_VERSION_OBSOLETE',
        message: result.message,
        currentVersionId: result.currentVersionId,
        currentVersionName: result.currentVersionName,
        currentVersionCode: result.currentVersionCode,
      });
      return;
    }

    next();
  }
}
