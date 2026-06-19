import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /** GET /api/units — public: the booking form needs the active unit list. */
  @Get()
  findAll() {
    return this.unitsService.findAll(true);
  }

  /** POST /api/units — admin only: add a new unit. */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  /** POST /api/units/bulk — admin only: import many units (e.g. from Excel). */
  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  createMany(@Body() dto: BulkCreateUnitsDto) {
    return this.unitsService.createMany(dto.units);
  }
}
