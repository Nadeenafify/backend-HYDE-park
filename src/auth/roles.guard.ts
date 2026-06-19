import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserRole } from '../users/entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

/**
 * Allows the request only if the authenticated user's role is in the route's
 * @Roles(...) list. Must run after JwtAuthGuard (which attaches `req.user`).
 * Routes without @Roles are open to any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { role?: UserRole } }>();
    const role = req.user?.role;
    if (role && required.includes(role)) return true;

    throw new ForbiddenException(
      'You do not have permission to perform this action',
    );
  }
}
