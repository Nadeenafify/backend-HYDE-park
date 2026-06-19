import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActivityLogService } from '../activity/activity-log.service';

@Controller('units')
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly logs: ActivityLogService,
  ) {}

  /** GET /api/units — public: the booking form needs the active unit list. */
  @Get()
  findAll() {
    return this.unitsService.findAll(true);
  }

  /** POST /api/units — super admin only: add a new unit. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateUnitDto, @CurrentUser() user: JwtUser) {
    const unit = await this.unitsService.create(dto);
    await this.logs.record({
      user,
      action: 'unit.create',
      description: `Added unit ${unit.code}`,
    });
    return unit;
  }

  /** POST /api/units/bulk — super admin only: import many units (Excel). */
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createMany(@Body() dto: BulkCreateUnitsDto, @CurrentUser() user: JwtUser) {
    const result = await this.unitsService.createMany(dto.units);
    await this.logs.record({
      user,
      action: 'unit.import',
      description: `Imported ${result.created} units (skipped ${result.skipped})`,
    });
    return result;
  }
}
