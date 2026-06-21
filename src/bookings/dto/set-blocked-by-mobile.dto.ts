import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';

/** Block/unblock a customer by their mobile number (applies to all their bookings). */
export class SetBlockedByMobileDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  mobile: string;

  @IsBoolean({ message: 'blocked must be a boolean' })
  blocked: boolean;
}
