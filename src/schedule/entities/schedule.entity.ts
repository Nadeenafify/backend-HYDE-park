import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type ScheduleMode = 'global' | 'perDay';

/** Per-weekday config: whether the day is open and (for per-day mode) its slots. */
export interface DaySchedule {
  open: boolean;
  slots: string[];
}

/**
 * Singleton (id = 1) holding the bookable working days + time slots that drive
 * the booking calendar. Replaces the old admin-declared closed-days model.
 */
@Entity({ name: 'schedule' })
export class Schedule {
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** 'global' = one slot list for every open day; 'perDay' = each day its own. */
  @Column({ type: 'varchar', length: 10, default: 'global' })
  mode: ScheduleMode;

  /** Time slots used when mode = 'global'. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  globalSlots: string[];

  /** Exactly 7 entries indexed by weekday (0 = Sunday … 6 = Saturday). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  days: DaySchedule[];

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
