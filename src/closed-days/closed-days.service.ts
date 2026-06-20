import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClosedDay } from './entities/closed-day.entity';

@Injectable()
export class ClosedDaysService {
  constructor(
    @InjectRepository(ClosedDay)
    private readonly closedDaysRepo: Repository<ClosedDay>,
  ) {}

  /** All closed days, soonest first. Public-safe (no PII). */
  findAll(): Promise<ClosedDay[]> {
    return this.closedDaysRepo.find({ order: { date: 'ASC' } });
  }

  async create(date: string, reason?: string): Promise<ClosedDay> {
    const existing = await this.closedDaysRepo.findOne({ where: { date } });
    if (existing) {
      throw new ConflictException(`${date} is already marked as a closed day`);
    }
    const day = this.closedDaysRepo.create({ date, reason: reason ?? null });
    return this.closedDaysRepo.save(day);
  }

  async remove(id: string): Promise<void> {
    const day = await this.closedDaysRepo.findOne({ where: { id } });
    if (!day) {
      throw new NotFoundException(`Closed day ${id} not found`);
    }
    await this.closedDaysRepo.remove(day);
  }

  /** True if the given YYYY-MM-DD is an admin-declared closed day. */
  async isClosed(date: string): Promise<boolean> {
    const count = await this.closedDaysRepo.count({ where: { date } });
    return count > 0;
  }
}
