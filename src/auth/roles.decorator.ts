import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Restrict a route (or controller) to the given roles. Pair with RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
