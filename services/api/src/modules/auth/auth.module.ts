import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmtpMailService } from './smtp-mail.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, SmtpMailService],
  exports: [AuthService, SmtpMailService],
})
export class AuthModule {}
