import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DaySchedule, Schedule } from './entities/schedule.entity';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

const DEFAULT_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
];

// Sun(0)…Sat(6): open Sunday–Thursday, closed Friday & Saturday by default.
const DEFAULT_DAYS: DaySchedule[] = Array.from({ length: 7 }, (_, w) => ({
  open: w !== 5 && w !== 6,
  slots: [...DEFAULT_SLOTS],
}));

@Injectable()
export class ScheduleService implements OnModuleInit {
  constructor(
    @InjectRepository(Schedule)
    private readonly repo: Repository<Schedule>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.get(); // ensure the singleton row exists
  }

  /** The singleton schedule, seeding sensible defaults on first run. */
  async get(): Promise<Schedule> {
    const existing = await this.repo.findOne({ where: { id: 1 } });
    if (existing) return existing;
    return this.repo.save(
      this.repo.create({
        id: 1,
        mode: 'global',
        globalSlots: [...DEFAULT_SLOTS],
        days: DEFAULT_DAYS,
      }),
    );
  }

  async update(dto: UpdateScheduleDto): Promise<Schedule> {
    const current = await this.get();
    current.mode = dto.mode;
    current.globalSlots = dto.globalSlots;
    current.days = dto.days;
    return this.repo.save(current);
  }

  /**
   * Bookable slots for a given local YYYY-MM-DD — empty if the weekday is closed.
   * In global mode every open day shares globalSlots; in per-day mode each day
   * uses its own list.
   */
  async slotsForDate(date: string): Promise<string[]> {
    const schedule = await this.get();
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const day = schedule.days?.[weekday];
    if (!day || !day.open) return [];
    return schedule.mode === 'global' ? schedule.globalSlots : day.slots;
  }
}
