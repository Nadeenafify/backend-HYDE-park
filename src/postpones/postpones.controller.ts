import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { PostponesService } from './postpones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/** Audit/reporting feed of postpones. Manager or super admin only. */
@Controller('postpones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
export class PostponesController {
  constructor(private readonly postpones: PostponesService) {}

  /** GET /api/postpones — all postpones, newest first. */
  @Get()
  findAll() {
    return this.postpones.findAll();
  }

  /** GET /api/postpones/booking/:id — the trail for one booking. */
  @Get('booking/:id')
  findForBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.postpones.findForBooking(id);
  }
}
