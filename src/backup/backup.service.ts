import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Unit } from '../units/entities/unit.entity';

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(Unit)
    private readonly units: Repository<Unit>,
  ) {}

  /** Full snapshot of all data — the contents of a downloadable backup. */
  async exportAll() {
    const [units, bookings] = await Promise.all([
      this.units.find({ order: { code: 'ASC' } }),
      this.bookings.find({ order: { createdAt: 'ASC' } }),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: { units: units.length, bookings: bookings.length },
      units,
      bookings,
    };
  }

  /**
   * Additive restore: re-inserts records (by id) that are not already present.
   * Existing rows are kept untouched, so this never destroys current data.
   */
  async restore(payload: { units?: unknown[]; bookings?: unknown[] }) {
    const result = {
      units: { created: 0, skipped: 0 },
      bookings: { created: 0, skipped: 0 },
    };

    const units = Array.isArray(payload?.units)
      ? (payload.units as Partial<Unit>[])
      : [];
    const existingUnitIds = new Set(
      (await this.units.find({ select: { id: true } })).map((u) => u.id),
    );
    for (const u of units) {
      if (!u?.id || existingUnitIds.has(u.id)) {
        result.units.skipped++;
        continue;
      }
      try {
        await this.units.insert(u as Unit);
        existingUnitIds.add(u.id);
        result.units.created++;
      } catch {
        result.units.skipped++;
      }
    }

    const bookings = Array.isArray(payload?.bookings)
      ? (payload.bookings as Partial<Booking>[])
      : [];
    const existingBookingIds = new Set(
      (await this.bookings.find({ select: { id: true } })).map((b) => b.id),
    );
    for (const b of bookings) {
      if (!b?.id || existingBookingIds.has(b.id)) {
        result.bookings.skipped++;
        continue;
      }
      try {
        await this.bookings.insert(b as Booking);
        existingBookingIds.add(b.id);
        result.bookings.created++;
      } catch {
        result.bookings.skipped++;
      }
    }

    return result;
  }
}
