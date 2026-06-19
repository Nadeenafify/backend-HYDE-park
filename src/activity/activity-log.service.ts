import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import type { JwtUser } from '../auth/current-user.decorator';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  /**
   * Persist an activity entry. Never throws — logging must not break the action
   * that triggered it.
   */
  async record(entry: {
    user?: { sub?: string; name?: string; email?: string } | JwtUser | null;
    action: string;
    description: string;
  }): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          userId: entry.user?.sub ?? null,
          userName: entry.user?.name ?? null,
          userEmail: entry.user?.email ?? null,
          action: entry.action,
          description: entry.description,
        }),
      );
    } catch {
      /* swallow — a failed log should never fail the request */
    }
  }

  findRecent(opts: { action?: string; limit?: number }): Promise<ActivityLog[]> {
    const take = Math.min(opts.limit ?? 200, 500);
    return this.repo.find({
      where: opts.action ? { action: opts.action } : {},
      order: { createdAt: 'DESC' },
      take,
    });
  }
}
