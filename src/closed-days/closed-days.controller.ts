import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClosedDaysService } from './closed-days.service';
import { CreateClosedDayDto } from './dto/create-closed-day.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActivityLogService } from '../activity/activity-log.service';

@Controller('closed-days')
export class ClosedDaysController {
  constructor(
    private readonly closedDaysService: ClosedDaysService,
    private readonly logs: ActivityLogService,
  ) {}

  /** GET /api/closed-days — public: the booking calendar disables these dates. */
  @Get()
  findAll() {
    return this.closedDaysService.findAll();
  }

  /** POST /api/closed-days — manager or super admin: mark a day as closed. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async create(
    @Body() dto: CreateClosedDayDto,
    @CurrentUser() user: JwtUser,
  ) {
    const day = await this.closedDaysService.create(dto.date, dto.reason);
    await this.logs.record({
      user,
      action: 'closedDay.create',
      description: `Closed ${day.date}${day.reason ? ` (${day.reason})` : ''}`,
    });
    return day;
  }

  /** DELETE /api/closed-days/:id — manager or super admin: reopen a day. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    await this.closedDaysService.remove(id);
    await this.logs.record({
      user,
      action: 'closedDay.delete',
      description: `Reopened a previously closed day (#${id.slice(0, 8).toUpperCase()})`,
    });
  }
}
