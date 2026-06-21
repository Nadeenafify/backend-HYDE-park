import { promises as fs } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Not, Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  PostponeRecord,
} from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PostponeBookingDto } from './dto/postpone-booking.dto';
import { UnitsService } from '../units/units.service';
import { ClosedDaysService } from '../closed-days/closed-days.service';
import { Postpone } from '../postpones/entities/postpone.entity';
import { BlockEvent } from '../block-events/entities/block-event.entity';
import { JwtUser } from '../auth/current-user.decorator';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
    private readonly unitsService: UnitsService,
    private readonly closedDaysService: ClosedDaysService,
  ) {}

  async create(
    dto: CreateBookingDto,
    receipt?: Express.Multer.File,
  ): Promise<Booking> {
    if (!dto.agreedToTerms) {
      throw new BadRequestException('You must agree to the terms of service');
    }

    // A customer whose mobile was blocked by customer service cannot rebook
    // online — they must call in.
    await this.assertNotBlocked(dto.mobile);

    // Closed on weekends / national holidays / admin-declared closed days.
    await this.assertBookableDate(dto.installationDate);

    const unitExists = await this.unitsService.existsActive(dto.unitCode);
    if (!unitExists) {
      throw new BadRequestException(`Unknown unit "${dto.unitCode}"`);
    }

    // Each installation slot (date + time) can be booked only once. A cancelled
    // booking frees the slot again.
    await this.assertSlotFree(dto.installationDate, dto.installationTime);

    const booking = this.bookingsRepo.create({
      unitCode: dto.unitCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      installationDate: dto.installationDate,
      installationTime: dto.installationTime,
      agreedToTerms: dto.agreedToTerms,
      status: BookingStatus.PENDING,
      receiptFilename: receipt?.filename ?? null,
      receiptOriginalName: receipt?.originalname ?? null,
      receiptPath: receipt ? `/uploads/${receipt.filename}` : null,
    });

    return this.bookingsRepo.save(booking);
  }

  /**
   * Reject weekends (Fri/Sat) and any day an admin has marked closed in the
   * closed_days table. All holidays are admin-managed — none are hardcoded.
   */
  private async assertBookableDate(installationDate: string): Promise<void> {
    const weekday = new Date(`${installationDate}T00:00:00Z`).getUTCDay();
    if (weekday === 5 || weekday === 6) {
      throw new BadRequestException(
        'Installations are not available on Fridays or Saturdays (official holidays).',
      );
    }
    if (await this.closedDaysService.isClosed(installationDate)) {
      throw new BadRequestException(
        'Installations are not available on this day — it is closed (holiday). ' +
          'هذا اليوم مغلق (إجازة)، برجاء اختيار يوم آخر.',
      );
    }
  }

  /** Reject a booking from a mobile number an admin has blocked. */
  private async assertNotBlocked(mobile: string): Promise<void> {
    const blocked = await this.bookingsRepo.findOne({
      where: { mobile, blocked: true },
    });
    if (blocked) {
      throw new ForbiddenException(
        'This mobile number is blocked from online booking. Please contact ' +
          'customer service. هذا الرقم محظور من الحجز عبر الموقع، برجاء ' +
          'التواصل مع خدمة العملاء.',
      );
    }
  }

  /** Reject a slot already taken by another (non-cancelled) booking. */
  private async assertSlotFree(
    installationDate: string,
    installationTime: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.bookingsRepo.findOne({
      where: {
        installationDate,
        installationTime,
        status: Not(BookingStatus.CANCELLED),
      },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'This installation date and time is already booked. Please choose another slot.',
      );
    }
  }

  /**
   * Postpone a booking to a new date/time: validates the new slot, frees the
   * old one, records the move, and flags the booking as postponed.
   */
  async postpone(
    id: string,
    dto: PostponeBookingDto,
    actor?: JwtUser,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot postpone a cancelled booking.');
    }
    if (
      booking.installationDate === dto.installationDate &&
      booking.installationTime === dto.installationTime
    ) {
      throw new BadRequestException('Pick a different date or time to postpone.');
    }

    await this.assertBookableDate(dto.installationDate);
    await this.assertSlotFree(
      dto.installationDate,
      dto.installationTime,
      booking.id,
    );

    const record: PostponeRecord = {
      fromDate: booking.installationDate,
      fromTime: booking.installationTime,
      toDate: dto.installationDate,
      toTime: dto.installationTime,
      at: new Date().toISOString(),
    };

    // Capture the very first date on the first postpone.
    if (!booking.postponeCount || !booking.originalDate) {
      booking.originalDate = booking.installationDate;
      booking.originalTime = booking.installationTime;
    }
    booking.postponeHistory = [...(booking.postponeHistory ?? []), record];
    booking.postponeCount = (booking.postponeCount ?? 0) + 1;
    booking.postponedAt = new Date();
    booking.installationDate = dto.installationDate;
    booking.installationTime = dto.installationTime;

    // Persist the booking and its audit row together: either both land or
    // neither does, so the postpones table can never drift from the booking.
    return this.bookingsRepo.manager.transaction(async (em) => {
      const saved = await em.save(booking);
      await em.getRepository(Postpone).insert({
        bookingId: booking.id,
        unitCode: booking.unitCode,
        fromDate: record.fromDate,
        fromTime: record.fromTime,
        toDate: record.toDate,
        toTime: record.toTime,
        sequence: booking.postponeCount,
        actorId: actor?.sub ?? null,
        actorName: actor?.name ?? null,
        actorEmail: actor?.email ?? null,
      });
      return saved;
    });
  }

  /**
   * Installation slots (date + time) already taken by a non-cancelled booking,
   * from today onward. Public-safe: contains no customer PII.
   */
  async getTakenSlots(): Promise<{ date: string; time: string }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.bookingsRepo.find({
      where: {
        status: Not(BookingStatus.CANCELLED),
        installationDate: MoreThanOrEqual(today),
      },
      select: { installationDate: true, installationTime: true },
    });

    const seen = new Set<string>();
    const slots: { date: string; time: string }[] = [];
    for (const r of rows) {
      const key = `${r.installationDate}|${r.installationTime}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push({ date: r.installationDate, time: r.installationTime });
    }
    return slots;
  }

  findAll(status?: BookingStatus): Promise<Booking[]> {
    return this.bookingsRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await this.findOne(id);
    booking.status = status;
    return this.bookingsRepo.save(booking);
  }

  /**
   * Block or unblock a customer from online booking. The flag is per mobile
   * number, so it's applied to every booking that customer has made — keeping
   * the dashboard consistent and the create() check reliable.
   */
  async setBlocked(
    id: string,
    blocked: boolean,
    actor?: JwtUser,
  ): Promise<Booking> {
    const booking = await this.findOne(id);
    const customerName =
      `${booking.firstName} ${booking.lastName}`.trim() || null;

    // Flip the flag on every booking for this mobile and record the audit row
    // together, so the block_events history can't drift from the live state.
    await this.bookingsRepo.manager.transaction(async (em) => {
      await em.update(Booking, { mobile: booking.mobile }, { blocked });
      await em.getRepository(BlockEvent).insert({
        mobile: booking.mobile,
        customerName,
        blocked,
        actorId: actor?.sub ?? null,
        actorName: actor?.name ?? null,
        actorEmail: actor?.email ?? null,
      });
    });

    booking.blocked = blocked;
    return booking;
  }

  /**
   * Block/unblock a customer by mobile number — used by the Blocked admin view,
   * where actions are keyed by mobile rather than a specific booking. Resolves
   * any booking for that mobile, then reuses setBlocked (which fans the flag out
   * across every booking for the number and writes the audit row).
   */
  async setBlockedByMobile(
    mobile: string,
    blocked: boolean,
    actor?: JwtUser,
  ): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { mobile } });
    if (!booking) {
      throw new NotFoundException(`No booking found for mobile ${mobile}`);
    }
    return this.setBlocked(booking.id, blocked, actor);
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    // Best-effort cleanup of the stored receipt file.
    if (booking.receiptFilename) {
      const filePath = join(process.cwd(), 'uploads', booking.receiptFilename);
      await fs.unlink(filePath).catch(() => undefined);
    }
    await this.bookingsRepo.remove(booking);
  }
}
