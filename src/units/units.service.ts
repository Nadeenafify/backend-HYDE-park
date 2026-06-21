import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';

// Seed data mirrors the UNIT_OPTIONS list used by the frontend dropdown.
const DEFAULT_UNITS = [
  'A-101', 'A-102', 'A-201', 'A-202',
  'B-101', 'B-102', 'B-201', 'B-202',
  'Villa-01', 'Villa-02', 'Villa-03',
];

@Injectable()
export class UnitsService implements OnModuleInit {
  constructor(
    @InjectRepository(Unit)
    private readonly unitsRepo: Repository<Unit>,
  ) {}

  /** Seed the default units once, on first startup, if the table is empty. */
  async onModuleInit(): Promise<void> {
    const count = await this.unitsRepo.count();
    if (count === 0) {
      const units = DEFAULT_UNITS.map((code) =>
        this.unitsRepo.create({ code, isActive: true }),
      );
      await this.unitsRepo.save(units);
      // eslint-disable-next-line no-console
      console.log(`🌱 Seeded ${units.length} units.`);
    }
  }

  findAll(onlyActive = true): Promise<Unit[]> {
    return this.unitsRepo.find({
      where: onlyActive ? { isActive: true } : {},
      order: { code: 'ASC' },
    });
  }

  async create(dto: CreateUnitDto): Promise<Unit> {
    const existing = await this.unitsRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Unit "${dto.code}" already exists`);
    }
    const unit = this.unitsRepo.create(dto);
    return this.unitsRepo.save(unit);
  }

  /**
   * Bulk-import units (e.g. from an Excel upload). Trims and de-duplicates the
   * incoming rows, skips any code that already exists, and inserts the rest.
   */
  async createMany(
    rows: { code: string; description?: string | null }[],
  ): Promise<{ created: number; skipped: number; total: number }> {
    const total = rows.length;

    // Normalize + dedupe within the uploaded file.
    const seen = new Set<string>();
    const cleaned: { code: string; description: string | null }[] = [];
    for (const r of rows) {
      const code = String(r.code ?? '').trim();
      if (!code) continue;
      const key = code.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const description = (r.description ?? '').toString().trim();
      cleaned.push({ code, description: description || null });
    }

    // Skip codes that already exist in the table.
    const existing = await this.unitsRepo.find({ select: { code: true } });
    const existingSet = new Set(existing.map((e) => e.code.toLowerCase()));
    const toInsert = cleaned.filter(
      (c) => !existingSet.has(c.code.toLowerCase()),
    );

    let created = toInsert.length;
    if (toInsert.length) {
      // INSERT ... ON CONFLICT DO NOTHING — the app-level filter above handles
      // the common case, but `.orIgnore()` makes us race-safe: if a concurrent
      // import inserts the same code between our read and write, the unique
      // index on `code` would otherwise throw and fail the whole batch. Here
      // the DB silently skips the conflicting row instead, and `raw` reports
      // only the rows actually inserted so our counts stay accurate.
      const result = await this.unitsRepo
        .createQueryBuilder()
        .insert()
        .into(Unit)
        .values(
          toInsert.map((c) => ({
            code: c.code,
            description: c.description,
            isActive: true,
          })),
        )
        .orIgnore()
        .execute();
      created = Array.isArray(result.raw) ? result.raw.length : toInsert.length;
    }

    return {
      created,
      skipped: total - created,
      total,
    };
  }

  /** True if a unit with the given code exists and is active. */
  async existsActive(code: string): Promise<boolean> {
    const count = await this.unitsRepo.count({
      where: { code, isActive: true },
    });
    return count > 0;
  }
}
