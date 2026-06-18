import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'bookings' })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unit code chosen in the form (e.g. "A-101"). */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  unitCode: string;

  @Column({ type: 'varchar', length: 80 })
  firstName: string;

  @Column({ type: 'varchar', length: 80 })
  lastName: string;

  @Column({ type: 'varchar', length: 20 })
  mobile: string;

  /** Stored filename of the uploaded HPD receipt. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  receiptFilename: string | null;

  /** Original filename as uploaded by the client. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  receiptOriginalName: string | null;

  /** Public path to the receipt, e.g. /uploads/<filename>. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  receiptPath: string | null;

  /** Requested installation date (calendar day). */
  @Column({ type: 'date' })
  installationDate: string;

  /** Requested installation time slot, e.g. "10:00 AM". */
  @Column({ type: 'varchar', length: 20 })
  installationTime: string;

  @Column({ type: 'boolean', default: false })
  agreedToTerms: boolean;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
