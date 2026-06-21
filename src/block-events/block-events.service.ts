import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockEvent } from './entities/block-event.entity';

@Injectable()
export class BlockEventsService {
  constructor(
    @InjectRepository(BlockEvent)
    private readonly repo: Repository<BlockEvent>,
  ) {}

  /** Audit feed: every block/unblock, newest first (capped for safety). */
  findAll(limit = 500): Promise<BlockEvent[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
