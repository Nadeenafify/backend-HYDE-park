import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /** GET /api/backup — full snapshot of all data (admin only). */
  @Get()
  exportAll() {
    return this.backupService.exportAll();
  }

  /** POST /api/backup/restore — re-add missing records from a backup. */
  @Post('restore')
  restore(@Body() body: { units?: unknown[]; bookings?: unknown[] }) {
    return this.backupService.restore(body);
  }
}
