import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RequestsModule } from '../requests/requests.module';
import { SessionsModule } from '../sessions/sessions.module';
import { PlansModule } from '../plans/plans.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [RequestsModule, SessionsModule, PlansModule, VouchersModule],
  controllers: [AdminController],
})
export class AdminModule {}
