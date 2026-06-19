import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    // Registered globally so JwtAuthGuard (used in other feature modules) can
    // inject JwtService without each module re-importing JwtModule.
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || secret === 'dev-secret-change-me') {
          // Fail fast rather than silently signing tokens with a guessable key.
          throw new Error(
            'JWT_SECRET is not set to a secure value. Set a long random JWT_SECRET in the environment.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>(
              'JWT_EXPIRES_IN',
              '1d',
            ) as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
