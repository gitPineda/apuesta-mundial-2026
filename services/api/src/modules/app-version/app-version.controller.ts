import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppVersionService } from './app-version.service';

@ApiTags('app-version')
@Controller('app-version')
export class AppVersionController {
  constructor(private readonly appVersion: AppVersionService) {}

  @Get('check')
  check(
    @Headers('x-app-version-id') versionId?: string,
    @Query('platform') platform = 'android',
  ) {
    return this.appVersion.check(platform, versionId);
  }
}
