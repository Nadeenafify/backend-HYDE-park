import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One audit row per block/unblock action. Blocking still lives as the
 * `blocked` flag on bookings (the enforcement source of truth); this table is
 * the queryable history of who blocked/unblocked which customer, and when.
 * Append-only; never updated.
 */
@Entity({ name: 'block_events' })
export class BlockEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The customer's mobile number the action applied to. Indexed. */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  mobile: string;

  /** Customer name at the time of the action (denormalized for reporting). */
  @Column({ type: 'varchar', length: 161, nullable: true })
  customerName: string | null;

  /** The resulting state: true = blocked, false = unblocked. */
  @Column({ type: 'boolean' })
  blocked: boolean;

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
