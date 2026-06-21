import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postpone } from './entities/postpone.entity';

@Injectable()
export class PostponesService {
  constructor(
    @InjectRepository(Postpone)
    private readonly repo: Repository<Postpone>,
  ) {}

  /** Audit feed: every postpone, newest first (capped for safety). */
  findAll(limit = 500): Promise<Postpone[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }

  /** Full postpone trail for a single booking, oldest first. */
  findForBooking(bookingId: string): Promise<Postpone[]> {
    return this.repo.find({
      where: { bookingId },
      order: { sequence: 'ASC' },
    });
  }
}
