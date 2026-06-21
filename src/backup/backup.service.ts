import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Unit } from '../units/entities/unit.entity';

/** A single thing the operator should know about one row of a restore. */
export interface RestoreNote {
  /** Human-readable identifier for the row (code, id, or name). */
  ref: string;
  reason: string;
}

/** Outcome of restoring one entity (units or bookings). */
export interface RestoreEntityResult {
  /** Rows newly inserted. */
  created: number;
  /** Rows already present (by id, or — for units — by unique code). */
  skipped: number;
  /** Rows that could not be inserted; see `errors` for why. */
  failed: number;
  /** Why each failed row failed. */
  errors: RestoreNote[];
  /** Rows inserted but with an integrity concern (e.g. dangling reference). */
  warnings: RestoreNote[];
}

export interface RestoreResult {
  units: RestoreEntityResult;
  bookings: RestoreEntityResult;
}

const emptyEntityResult = (): RestoreEntityResult => ({
  created: 0,
  skipped: 0,
  failed: 0,
  errors: [],
  warnings: [],
});

/** Turn a thrown insert error into a concise, loggable reason. */
function reasonFrom(err: unknown): string {
  if (err instanceof Error) {
    // Postgres driver errors carry the useful specifics on `detail`.
    const detail = (err as { detail?: string }).detail;
    return detail ? `${err.message} (${detail})` : err.message;
  }
  return 'unknown error';
}

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
   *
   * It respects the data's real constraints:
   * - Units are de-duplicated by `id` AND by their UNIQUE `code`.
   * - Per-row insert failures are captured with a reason instead of being
   *   silently swallowed.
   * - Bookings link to units by the denormalised `unitCode` string (no FK),
   *   so an orphaned reference is allowed but reported as a warning.
   */
  async restore(payload: {
    units?: unknown[];
    bookings?: unknown[];
  }): Promise<RestoreResult> {
    const result: RestoreResult = {
      units: emptyEntityResult(),
      bookings: emptyEntityResult(),
    };

    // --- Units -------------------------------------------------------------
    const units = Array.isArray(payload?.units)
      ? (payload.units as Partial<Unit>[])
      : [];
    const existingUnits = await this.units.find({
      select: { id: true, code: true },
    });
    const existingUnitIds = new Set(existingUnits.map((u) => u.id));
    // `code` carries a UNIQUE constraint and is how bookings reference units,
    // so we track it for both de-duplication and the orphan check below.
    const knownUnitCodes = new Set(existingUnits.map((u) => u.code));

    for (const u of units) {
      const ref = u?.code || u?.id || '(unknown unit)';
      if (!u?.id) {
        result.units.failed++;
        result.units.errors.push({ ref, reason: 'missing id' });
        continue;
      }
      if (existingUnitIds.has(u.id) || (u.code != null && knownUnitCodes.has(u.code))) {
        result.units.skipped++;
        continue;
      }
      try {
        await this.units.insert(u as Unit);
        existingUnitIds.add(u.id);
        if (u.code != null) knownUnitCodes.add(u.code);
        result.units.created++;
      } catch (err) {
        result.units.failed++;
        result.units.errors.push({ ref, reason: reasonFrom(err) });
      }
    }

    // --- Bookings ----------------------------------------------------------
    const bookings = Array.isArray(payload?.bookings)
      ? (payload.bookings as Partial<Booking>[])
      : [];
    const existingBookingIds = new Set(
      (await this.bookings.find({ select: { id: true } })).map((b) => b.id),
    );

    for (const b of bookings) {
      const ref =
        b?.id || `${b?.firstName ?? ''} ${b?.lastName ?? ''}`.trim() || '(unknown booking)';
      if (!b?.id) {
        result.bookings.failed++;
        result.bookings.errors.push({ ref, reason: 'missing id' });
        continue;
      }
      if (existingBookingIds.has(b.id)) {
        result.bookings.skipped++;
        continue;
      }
      try {
        await this.bookings.insert(b as Booking);
        existingBookingIds.add(b.id);
        result.bookings.created++;
        // No FK backs `unitCode`, so a dangling reference can't be caught by
        // the DB — surface it instead of letting it pass silently.
        if (b.unitCode != null && !knownUnitCodes.has(b.unitCode)) {
          result.bookings.warnings.push({
            ref,
            reason: `references unit "${b.unitCode}" which does not exist`,
          });
        }
      } catch (err) {
        result.bookings.failed++;
        result.bookings.errors.push({ ref, reason: reasonFrom(err) });
      }
    }

    return result;
  }
}
