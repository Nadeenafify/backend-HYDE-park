import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SafeUser, User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /** Seed the first Super Admin (from ADMIN_USERNAME/PASSWORD) if none exist. */
  async onModuleInit(): Promise<void> {
    if ((await this.repo.count()) > 0) return;
    const email = (
      this.config.get<string>('ADMIN_USERNAME') || 'admin@gmail.com'
    )
      .trim()
      .toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD') || 'admin123';
    await this.repo.save(
      this.repo.create({
        name: 'Super Admin',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`🌱 Seeded super admin: ${email}`);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException('A user with this email already exists');
    }
    return this.repo.save(
      this.repo.create({
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        isActive: true,
      }),
    );
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== user.email) {
        const existing = await this.findByEmail(email);
        if (existing && existing.id !== id) {
          throw new ConflictException('A user with this email already exists');
        }
        user.email = email;
      }
    }
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.repo.remove(user);
  }

  /** Strip the password hash before returning a user to a client. */
  toSafe(user: User): SafeUser {
    const { passwordHash: _omit, ...safe } = user;
    void _omit;
    return safe;
  }
}
