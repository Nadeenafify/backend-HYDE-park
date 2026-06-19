import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/** GET /api/logs — activity log, Super Admin only. */
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ActivityLogController {
  constructor(private readonly logs: ActivityLogService) {}

  @Get()
  findAll(@Query('action') action?: string) {
    return this.logs.findRecent({ action });
  }
}
