import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';

@Injectable()
export class UnitsService implements OnModuleInit {
  constructor(
    @InjectRepository(Unit)
    private readonly unitsRepo: Repository<Unit>,
  ) {}

  /**
   * Normalize legacy codes to canonical uppercase on startup. Units are NOT
   * seeded — the list is entirely admin-managed, so an empty table simply means
   * no units have been added yet (the form then shows an empty state).
   */
  async onModuleInit(): Promise<void> {
    await this.normalizeExistingCodes();
  }

  /**
   * One-time migration: bring any mixed-case legacy code to the canonical
   * uppercase form so the whole table shares one format. Skips a row whose
   * uppercased code would collide with another existing code (avoids a unique
   * violation) and leaves it as-is.
   */
  private async normalizeExistingCodes(): Promise<void> {
    const all = await this.unitsRepo.find();
    for (const u of all) {
      const upper = u.code.toUpperCase();
      if (u.code === upper) continue;
      if (all.some((o) => o.id !== u.id && o.code === upper)) {
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️  Unit "${u.code}" not uppercased — "${upper}" already exists.`,
        );
        continue;
      }
      u.code = upper;
      await this.unitsRepo.save(u);
    }
  }

  findAll(onlyActive = true): Promise<Unit[]> {
    return this.unitsRepo.find({
      where: onlyActive ? { isActive: true } : {},
      order: { code: 'ASC' },
    });
  }

  async create(dto: CreateUnitDto): Promise<Unit> {
    // Store codes in one canonical format (uppercase) so "a-101" and "A-101"
    // can never coexist and lookups always match.
    const code = dto.code.trim().toUpperCase();
    const existing = await this.unitsRepo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Unit "${code}" already exists`);
    }
    const unit = this.unitsRepo.create({ ...dto, code });
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

    // Normalize to canonical uppercase + dedupe within the uploaded file.
    const seen = new Set<string>();
    const cleaned: { code: string; description: string | null }[] = [];
    for (const r of rows) {
      const code = String(r.code ?? '').trim().toUpperCase();
      if (!code) continue;
      if (seen.has(code)) continue;
      seen.add(code);
      const description = (r.description ?? '').toString().trim();
      cleaned.push({ code, description: description || null });
    }

    // Skip codes that already exist in the table.
    const existing = await this.unitsRepo.find({ select: { code: true } });
    const existingSet = new Set(existing.map((e) => e.code.toUpperCase()));
    const toInsert = cleaned.filter((c) => !existingSet.has(c.code));

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
      where: { code: code.trim().toUpperCase(), isActive: true },
    });
    return count > 0;
  }
}
