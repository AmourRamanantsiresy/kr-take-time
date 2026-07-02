import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { FasModule } from './fas/fas.module';
import { PlansModule } from './plans/plans.module';
import { RequestsModule } from './requests/requests.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { SessionsModule } from './sessions/sessions.module';
import { MeModule } from './me/me.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DbModule,
    AuthModule,
    FasModule,
    PlansModule,
    RequestsModule,
    VouchersModule,
    SessionsModule,
    MeModule,
    AdminModule,
  ],
})
export class AppModule {}
