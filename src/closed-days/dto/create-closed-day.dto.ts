import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateClosedDayDto {
  /** The closed calendar day, as YYYY-MM-DD. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be a calendar day in YYYY-MM-DD format',
  })
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
