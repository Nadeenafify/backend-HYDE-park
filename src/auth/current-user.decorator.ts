import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Shape of the JWT payload attached to the request by JwtAuthGuard. */
export interface JwtUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}

/** Injects the authenticated user (JWT payload) into a route handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    return req.user;
  },
);
