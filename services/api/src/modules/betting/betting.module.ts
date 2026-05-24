import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { BettingController } from './betting.controller';
import { BettingService } from './betting.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BettingController],
  providers: [BettingService],
  exports: [BettingService],
})
export class BettingModule {}
