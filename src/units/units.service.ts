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

  /** True if a unit with the given code exists and is active. */
  async existsActive(code: string): Promise<boolean> {
    const count = await this.unitsRepo.count({
      where: { code, isActive: true },
    });
    return count > 0;
  }
}
