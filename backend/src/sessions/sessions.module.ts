import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { NdsctlService } from '../nds/ndsctl.service';
import { FasModule } from '../fas/fas.module';

@Module({
  imports: [FasModule],
  controllers: [SessionsController],
  providers: [SessionsService, NdsctlService],
  exports: [SessionsService, NdsctlService],
})
export class SessionsModule {}
