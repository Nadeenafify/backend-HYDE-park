import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class PostponeBookingDto {
  @IsDateString(
    {},
    { message: 'installationDate must be an ISO date (YYYY-MM-DD)' },
  )
  installationDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Installation time is required' })
  installationTime: string;
}
