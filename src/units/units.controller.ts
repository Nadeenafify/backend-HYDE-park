import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
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
}
