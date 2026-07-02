import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { ConnectDto } from './sessions.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/types';

@Controller('session')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('connect')
  @Roles('customer', 'admin')
  connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectDto) {
    return this.sessions.connect(user, dto);
  }
}
