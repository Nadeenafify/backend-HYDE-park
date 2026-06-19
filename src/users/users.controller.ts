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
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ActivityLogService } from '../activity/activity-log.service';

/** Account management — Super Admin only. */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly logs: ActivityLogService,
  ) {}

  @Get()
  async findAll() {
    return (await this.users.findAll()).map((u) => this.users.toSafe(u));
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtUser) {
    const created = await this.users.create(dto);
    await this.logs.record({
      user,
      action: 'user.create',
      description: `Created user ${created.email} (${created.role})`,
    });
    return this.users.toSafe(created);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.users.update(id, dto);
    await this.logs.record({
      user,
      action: 'user.update',
      description: `Updated user ${updated.email}`,
    });
    return this.users.toSafe(updated);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    if (user?.sub === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const target = await this.users.findById(id);
    await this.users.remove(id);
    await this.logs.record({
      user,
      action: 'user.delete',
      description: `Deleted user ${target?.email ?? id}`,
    });
  }
}
