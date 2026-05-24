import { Body, Controller, Get, Headers, Ip, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { UpdateLimitsDto } from './dto/update-limits.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: CurrentUser) {
    return this.users.getMe(user.id);
  }

  @Patch('me/profile')
  updateProfile(@CurrentUser() user: CurrentUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, user.email, dto);
  }

  @Post('me/accept-terms')
  acceptTerms(
    @CurrentUser() user: CurrentUser,
    @Body() dto: AcceptTermsDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.users.acceptTerms(user.id, dto, ip, userAgent);
  }

  @Get('me/limits')
  getLimits(@CurrentUser() user: CurrentUser) {
    return this.users.getLimits(user.id);
  }

  @Put('me/limits')
  updateLimits(@CurrentUser() user: CurrentUser, @Body() dto: UpdateLimitsDto) {
    return this.users.updateLimits(user.id, dto);
  }
}
