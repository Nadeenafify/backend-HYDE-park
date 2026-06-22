import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';

/**
 * Guard that requires a valid admin JWT (issued by POST /api/login) in the
 * `Authorization: Bearer <token>` header. Applied to every endpoint that reads
 * or mutates booking/unit data — only the public booking-submission and the
 * unit list used by the form are left unauthenticated.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    let payload: { sub?: string };
    try {
      // Verifies signature and expiry against JWT_SECRET. Throws on failure.
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    // Re-check the user against the DB so a deactivated, deleted, or role-changed
    // account loses access immediately rather than until the token expires. The
    // fresh record (not the token's frozen claims) drives RolesGuard.
    const user = payload.sub ? await this.users.findById(payload.sub) : null;
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    (req as Request & { user?: unknown }).user = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : null;
  }
}
