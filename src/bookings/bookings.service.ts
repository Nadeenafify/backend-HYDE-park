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
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UnitsService } from '../units/units.service';

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

    // Friday (5) and Saturday (6) are official holidays in Egypt — closed.
    const weekday = new Date(`${dto.installationDate}T00:00:00Z`).getUTCDay();
    if (weekday === 5 || weekday === 6) {
      throw new BadRequestException(
        'Installations are not available on Fridays or Saturdays (official holidays).',
      );
    }

    const unitExists = await this.unitsService.existsActive(dto.unitCode);
    if (!unitExists) {
      throw new BadRequestException(`Unknown unit "${dto.unitCode}"`);
    }

    // Each installation slot (date + time) can be booked only once. A cancelled
    // booking frees the slot again.
    const slotTaken = await this.bookingsRepo.findOne({
      where: {
        installationDate: dto.installationDate,
        installationTime: dto.installationTime,
        status: Not(BookingStatus.CANCELLED),
      },
    });
    if (slotTaken) {
      throw new ConflictException(
        'This installation date and time is already booked. Please choose another slot.',
      );
    }

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
