import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /** GET /api/units — public: the booking form needs the active unit list. */
  @Get()
  findAll() {
    return this.unitsService.findAll(true);
  }

  /** POST /api/units — super admin only: add a new unit. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  /** POST /api/units/bulk — super admin only: import many units (Excel). */
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  createMany(@Body() dto: BulkCreateUnitsDto) {
    return this.unitsService.createMany(dto.units);
  }
}
