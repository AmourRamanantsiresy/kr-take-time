import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/types';
import { DbService } from '../db/db.service';
import { AuditService } from '../db/audit.service';
import { RequestsService } from '../requests/requests.service';
import { SessionsService } from '../sessions/sessions.service';
import { PlansService } from '../plans/plans.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { GrantTimeDto } from './admin.dto';
import { CreatePlanDto, UpdatePlanDto } from '../plans/plans.dto';
import { GenerateVouchersDto } from '../vouchers/vouchers.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly requests: RequestsService,
    private readonly sessions: SessionsService,
    private readonly plans: PlansService,
    private readonly vouchers: VouchersService,
  ) {}

  @Get('requests')
  pendingRequests() {
    return this.requests.listPending();
  }

  @Post('requests/:id/approve')
  approve(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.requests.decide(actor, id, true);
  }

  @Post('requests/:id/reject')
  reject(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.requests.decide(actor, id, false);
  }

  @Get('users')
  users(@Query('q') q?: string) {
    return this.db.query(
      `SELECT id, username, role, remaining_seconds, device_limit, created_at
       FROM users
       WHERE ($1::text IS NULL OR username ILIKE '%' || $1 || '%')
       ORDER BY created_at DESC LIMIT 200`,
      [q ?? null],
    );
  }

  @Post('users/:id/grant')
  async grant(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GrantTimeDto,
  ) {
    const user = await this.db.one(
      `UPDATE users SET
         remaining_seconds = remaining_seconds + $2,
         device_limit = GREATEST(device_limit, COALESCE($3, device_limit))
       WHERE id = $1
       RETURNING id, username, remaining_seconds, device_limit`,
      [id, dto.minutes * 60, dto.device_limit ?? null],
    );
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log(actor.id, 'user.grant', `user:${id}`, { ...dto });
    return user;
  }

  @Get('sessions/active')
  activeSessions() {
    return this.sessions.activeSessions();
  }

  @Post('sessions/:mac/kick')
  kick(@CurrentUser() actor: AuthUser, @Param('mac') mac: string) {
    return this.sessions.kick(actor, mac);
  }

  @Get('plans')
  allPlans() {
    return this.plans.listAll();
  }

  @Post('plans')
  createPlan(@CurrentUser() actor: AuthUser, @Body() dto: CreatePlanDto) {
    return this.plans.create(actor, dto);
  }

  @Patch('plans/:id')
  updatePlan(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plans.update(actor, id, dto);
  }

  @Delete('plans/:id')
  deletePlan(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.plans.remove(actor, id);
  }

  @Post('vouchers/generate')
  generateVouchers(@CurrentUser() actor: AuthUser, @Body() dto: GenerateVouchersDto) {
    return this.vouchers.generate(actor, dto);
  }

  @Get('vouchers')
  listVouchers() {
    return this.vouchers.list();
  }

  @Get('audit')
  auditLog(@Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit ?? '200', 10) || 200, 1000);
    return this.db.query(
      `SELECT a.*, u.username AS actor_username
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC LIMIT $1`,
      [n],
    );
  }
}
