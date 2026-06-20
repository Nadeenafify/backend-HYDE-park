import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A single calendar day on which installations are not available (a holiday or
 * an admin-declared closed day). Booking attempts for these dates are rejected,
 * and the customer's date picker disables them.
 */
@Entity({ name: 'closed_days' })
export class ClosedDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The closed calendar day, stored as YYYY-MM-DD. Unique. */
  @Index({ unique: true })
  @Column({ type: 'date' })
  date: string;

  /** Optional human-facing reason, e.g. "عيد الأضحى". */
  @Column({ type: 'varchar', length: 120, nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
