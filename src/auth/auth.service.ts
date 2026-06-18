import { timingSafeEqual } from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

/**
 * Single-admin authentication for the booking dashboard.
 *
 * Credentials live in the environment (ADMIN_USERNAME / ADMIN_PASSWORD) rather
 * than a users table — there is exactly one operator. On a successful match we
 * issue a short-lived JWT signed with JWT_SECRET.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string }> {
    const expectedUser = this.config.get<string>('ADMIN_USERNAME');
    const expectedPass = this.config.get<string>('ADMIN_PASSWORD');

    // Refuse to run with unconfigured / placeholder credentials instead of
    // silently accepting a well-known default.
    if (
      !expectedUser ||
      !expectedPass ||
      expectedPass === 'pass123' ||
      expectedPass === 'admin'
    ) {
      throw new InternalServerErrorException(
        'Admin credentials are not configured. Set ADMIN_USERNAME and a strong ADMIN_PASSWORD.',
      );
    }

    const userOk = this.safeEqual(dto.username, expectedUser);
    const passOk = this.safeEqual(dto.password, expectedPass);
    // Evaluate both before branching so the response time does not leak which
    // field was wrong.
    if (!userOk || !passOk) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const token = await this.jwt.signAsync({ sub: dto.username, role: 'admin' });
    return { token };
  }

  /** Length-safe, constant-time string comparison. */
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      // Compare against itself to keep the timing profile constant.
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
