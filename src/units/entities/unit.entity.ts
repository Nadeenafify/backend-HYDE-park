import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A unit is either a commercial or a residential property. */
export enum UnitType {
  COMMERCIAL = 'commercial',
  RESIDENTIAL = 'residential',
}

@Entity({ name: 'units' })
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-facing unit code shown in the dropdown, e.g. "A-101" or "Villa-02". */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  /** Commercial or residential — drives the category picker in the booking form. */
  @Column({ type: 'enum', enum: UnitType, default: UnitType.RESIDENTIAL })
  type: UnitType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
