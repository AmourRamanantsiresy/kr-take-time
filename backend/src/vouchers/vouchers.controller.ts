import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { VouchersService } from './vouchers.service';
import { RedeemVoucherDto } from './vouchers.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/types';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Post('redeem')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemVoucherDto) {
    return this.vouchers.redeem(user, dto.code);
  }
}
