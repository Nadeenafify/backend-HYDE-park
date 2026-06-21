import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActivityLogService } from '../activity/activity-log.service';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly logs: ActivityLogService,
  ) {}

  /** GET /api/backup — full snapshot of all data (admin only). */
  @Get()
  async exportAll(@CurrentUser() user: JwtUser) {
    const data = await this.backupService.exportAll();
    await this.logs.record({
      user,
      action: 'backup.export',
      description: 'Downloaded a full backup',
    });
    return data;
  }

  /** POST /api/backup/restore — re-add missing records from a backup. */
  @Post('restore')
  async restore(
    @Body() body: { units?: unknown[]; bookings?: unknown[] },
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.backupService.restore(body);
    const { units, bookings } = result;
    await this.logs.record({
      user,
      action: 'backup.restore',
      description:
        `Restored ${units.created} units and ${bookings.created} bookings` +
        ` (skipped ${units.skipped + bookings.skipped}, ` +
        `failed ${units.failed + bookings.failed}, ` +
        `warnings ${bookings.warnings.length})`,
    });
    return result;
  }
}
