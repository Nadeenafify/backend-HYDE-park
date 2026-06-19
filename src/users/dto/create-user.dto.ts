import { IsEmail, IsEnum, IsString, Length, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsEnum(UserRole, { message: 'role must be super_admin, manager or viewer' })
  role: UserRole;
}
