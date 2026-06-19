import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'activity_logs' })
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Who performed the action (null if the user was later deleted). */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  userEmail: string | null;

  /** Machine code, e.g. "booking.status" or "user.delete". */
  @Index()
  @Column({ type: 'varchar', length: 60 })
  action: string;

  /** Human-readable summary shown in the dashboard. */
  @Column({ type: 'varchar', length: 300 })
  description: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
