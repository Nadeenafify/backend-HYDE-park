import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBlockedDto } from './dto/update-blocked.dto';
import { PostponeBookingDto } from './dto/postpone-booking.dto';
import { BookingStatus } from './entities/booking.entity';
import { receiptMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActivityLogService } from '../activity/activity-log.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly logs: ActivityLogService,
  ) {}

  /**
   * POST /api/bookings
   * Accepts multipart/form-data with the booking fields plus a `receipt` file.
   */
  @Post()
  @UseInterceptors(FileInterceptor('receipt', receiptMulterOptions))
  create(
    @Body() dto: CreateBookingDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    return this.bookingsService.create(dto, receipt);
  }

  /** GET /api/bookings?status=pending — admin only (contains customer PII). */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('status') status?: BookingStatus) {
    return this.bookingsService.findAll(status);
  }

  /**
   * GET /api/bookings/availability — public. Lists the installation slots
   * (date + time) that are already taken, so the booking form can disable them.
   * Declared before the ":id" route so it isn't captured as an id param.
   */
  @Get('availability')
  availability() {
    return this.bookingsService.getTakenSlots();
  }

  /** GET /api/bookings/:id — admin only. */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  /** PATCH /api/bookings/:id/status — manager or super admin. */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    const booking = await this.bookingsService.updateStatus(id, dto.status);
    await this.logs.record({
      user,
      action: 'booking.status',
      description: `Set booking #${id.slice(0, 8).toUpperCase()} to ${dto.status}`,
    });
    return booking;
  }

  /** PATCH /api/bookings/:id/blocked — block/unblock a customer from booking online. */
  @Patch(':id/blocked')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async setBlocked(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockedDto,
    @CurrentUser() user: JwtUser,
  ) {
    const booking = await this.bookingsService.setBlocked(id, dto.blocked);
    await this.logs.record({
      user,
      action: 'booking.blocked',
      description: `${dto.blocked ? 'Blocked' : 'Unblocked'} customer ${booking.mobile} (booking #${id.slice(0, 8).toUpperCase()})`,
    });
    return booking;
  }

  /** PATCH /api/bookings/:id/postpone — manager or super admin. */
  @Patch(':id/postpone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async postpone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostponeBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    const booking = await this.bookingsService.postpone(id, dto);
    await this.logs.record({
      user,
      action: 'booking.postpone',
      description: `Postponed booking #${id.slice(0, 8).toUpperCase()} to ${dto.installationDate} ${dto.installationTime}`,
    });
    return booking;
  }

  /** DELETE /api/bookings/:id — super admin only. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    await this.bookingsService.remove(id);
    await this.logs.record({
      user,
      action: 'booking.delete',
      description: `Deleted booking #${id.slice(0, 8).toUpperCase()}`,
    });
  }
}
