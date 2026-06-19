import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/** Account management — Super Admin only. */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async findAll() {
    return (await this.users.findAll()).map((u) => this.users.toSafe(u));
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.users.toSafe(await this.users.create(dto));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.toSafe(await this.users.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    if (req.user?.sub === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.users.remove(id);
  }
}
