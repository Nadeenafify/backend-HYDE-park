import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One audit row per postpone. The booking still carries its own
 * `postponeHistory` JSONB (the per-booking view), but this table is the
 * queryable, reportable record across all bookings — who moved what, from
 * when to when. Append-only; never updated.
 */
@Entity({ name: 'postpones' })
export class Postpone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The booking that was postponed. Indexed (a booking has many postpones). */
  @Index()
  @Column({ type: 'uuid' })
  bookingId: string;

  /** Denormalized so reports ("most-postponed units") need no join. */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  unitCode: string;

  @Column({ type: 'date' })
  fromDate: string;

  @Column({ type: 'varchar', length: 20 })
  fromTime: string;

  @Column({ type: 'date' })
  toDate: string;

  @Column({ type: 'varchar', length: 20 })
  toTime: string;

  /** Which postpone this was for the booking (1 = first move). */
  @Column({ type: 'int' })
  sequence: number;

  /** The admin who performed it (JWT actor). Null if not attributable. */
  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actorName: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  actorEmail: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
