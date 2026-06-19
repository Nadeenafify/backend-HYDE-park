import { IsNotEmpty, IsString } from 'class-validator';

/** Credentials posted to POST /api/login. */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
