import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActivityLogService } from '../activity/activity-log.service';

@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly schedule: ScheduleService,
    private readonly logs: ActivityLogService,
  ) {}

  /** GET /api/schedule — public: the booking form needs the working days/slots. */
  @Get()
  get() {
    return this.schedule.get();
  }

  /** PUT /api/schedule — manager or super admin: update working days/slots. */
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async update(@Body() dto: UpdateScheduleDto, @CurrentUser() user: JwtUser) {
    const saved = await this.schedule.update(dto);
    await this.logs.record({
      user,
      action: 'schedule.update',
      description: 'Updated working days & time slots',
    });
    return saved;
  }
}
