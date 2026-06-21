import { Controller, Get, UseGuards } from '@nestjs/common';
import { BlockEventsService } from './block-events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/** Audit/reporting feed of block & unblock actions. Manager or super admin. */
@Controller('block-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
export class BlockEventsController {
  constructor(private readonly blockEvents: BlockEventsService) {}

  /** GET /api/block-events — all block/unblock actions, newest first. */
  @Get()
  findAll() {
    return this.blockEvents.findAll();
  }
}
