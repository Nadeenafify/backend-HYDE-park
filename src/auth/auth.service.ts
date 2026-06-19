import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SafeUser } from '../users/entities/user.entity';
import { ActivityLogService } from '../activity/activity-log.service';
import { LoginDto } from './dto/login.dto';

/**
 * Authentication for the booking dashboard. Users live in the `users` table
 * (seeded with a Super Admin); each has a role that is embedded in the issued
 * JWT and enforced by RolesGuard on protected routes.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly logs: ActivityLogService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; user: SafeUser }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await this.users.comparePassword(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await this.logs.record({
      user: { sub: user.id, name: user.name, email: user.email },
      action: 'auth.login',
      description: `${user.name} signed in`,
    });
    return { token, user: this.users.toSafe(user) };
  }
}
