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
import { PostponeBookingDto } from './dto/postpone-booking.dto';
import { BookingStatus } from './entities/booking.entity';
import { receiptMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

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
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto.status);
  }

  /** PATCH /api/bookings/:id/postpone — manager or super admin. */
  @Patch(':id/postpone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
  postpone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostponeBookingDto,
  ) {
    return this.bookingsService.postpone(id, dto);
  }

  /** DELETE /api/bookings/:id — super admin only. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.remove(id);
  }
}
