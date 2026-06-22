import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BookingStatus } from '../../bookings/entities/booking.entity';

/**
 * Restore payloads are arbitrary JSON supplied by an operator, so every row is
 * validated against these DTOs before it can reach the database. The fields and
 * limits mirror the entity columns (unit.entity.ts / booking.entity.ts) so a
 * restore can never write data the normal create paths would reject.
 *
 * `id` and the audit timestamps are accepted (optional) because a restore
 * re-inserts existing records verbatim — but they are still type-checked.
 * Validation runs with `whitelist: true`, so any property without a decorator
 * here is stripped before insert and can never be persisted.
 */
export class RestoreUnitDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  createdAt?: string;
}

/** One entry of a booking's postpone history (stored as jsonb). */
export class RestorePostponeRecordDto {
  @IsString()
  @MaxLength(50)
  fromDate: string;

  @IsString()
  @MaxLength(50)
  fromTime: string;

  @IsString()
  @MaxLength(50)
  toDate: string;

  @IsString()
  @MaxLength(50)
  toTime: string;

  @IsString()
  @MaxLength(50)
  at: string;
}

export class RestoreBookingDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Length(1, 50)
  unitCode: string;

  @IsString()
  @Length(1, 80)
  firstName: string;

  @IsString()
  @Length(1, 80)
  lastName: string;

  @IsString()
  @Length(1, 20)
  mobile: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receiptFilename?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receiptOriginalName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  receiptPath?: string | null;

  @IsDateString()
  installationDate: string;

  @IsString()
  @MaxLength(20)
  installationTime: string;

  @IsOptional()
  @IsBoolean()
  agreedToTerms?: boolean;

  @IsOptional()
  @IsEnum(BookingStatus, {
    message: `status must be one of: ${Object.values(BookingStatus).join(', ')}`,
  })
  status?: BookingStatus;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;

  @IsOptional()
  @IsDateString()
  originalDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  originalTime?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  postponeCount?: number;

  @IsOptional()
  @IsDateString()
  postponedAt?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestorePostponeRecordDto)
  postponeHistory?: RestorePostponeRecordDto[] | null;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}
