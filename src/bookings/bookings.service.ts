import { promises as fs } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
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

// Fixed-date Egyptian national holidays (recur yearly), as "MM-DD".
const FIXED_HOLIDAYS = new Set([
  '01-07', // عيد الميلاد المجيد
  '01-25', // عيد الشرطة وثورة 25 يناير
  '04-25', // عيد تحرير سيناء
  '05-01', // عيد العمال
  '06-30', // ذكرى ثورة 30 يونيو
  '07-23', // عيد ثورة 23 يوليو
  '10-06', // عيد القوات المسلحة
]);

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
    private readonly unitsService: UnitsService,
  ) {}

  async create(
    dto: CreateBookingDto,
    receipt?: Express.Multer.File,
  ): Promise<Booking> {
    if (!dto.agreedToTerms) {
      throw new BadRequestException('You must agree to the terms of service');
    }

    // Closed on weekends / national holidays.
    this.assertBookableDate(dto.installationDate);

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

  /** Reject weekend (Fri/Sat) and fixed national-holiday dates. */
  private assertBookableDate(installationDate: string): void {
    const weekday = new Date(`${installationDate}T00:00:00Z`).getUTCDay();
    if (weekday === 5 || weekday === 6) {
      throw new BadRequestException(
        'Installations are not available on Fridays or Saturdays (official holidays).',
      );
    }
    if (FIXED_HOLIDAYS.has(installationDate.slice(5))) {
      throw new BadRequestException(
        'Installations are not available on official public holidays.',
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
  async postpone(id: string, dto: PostponeBookingDto): Promise<Booking> {
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

    this.assertBookableDate(dto.installationDate);
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

    return this.bookingsRepo.save(booking);
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
