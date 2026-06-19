import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Login identifier — stored lowercased and unique. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** A user with the password hash stripped — safe to return to clients. */
export type SafeUser = Omit<User, 'passwordHash'>;
