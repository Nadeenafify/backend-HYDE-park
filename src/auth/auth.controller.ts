import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * POST /api/login — verify credentials and return a JWT + the user.
   * Rate limited to 5 attempts / minute / IP to slow credential brute-forcing.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** GET /api/me — the currently authenticated user (any role). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user?: { sub?: string } }) {
    const id = req.user?.sub;
    const user = id ? await this.usersService.findById(id) : null;
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return this.usersService.toSafe(user);
  }
}
