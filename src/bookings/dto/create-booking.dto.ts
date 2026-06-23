import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { UnitType } from '../../units/entities/unit.entity';

/**
 * Fields arrive as multipart/form-data, so everything is a string on the wire.
 * The transforms below coerce the booleans/values into their real types before
 * validation runs.
 */
export class CreateBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'Unit is required' })
  unitCode: string;

  @IsEnum(UnitType, { message: 'Unit type must be commercial or residential' })
  unitType: UnitType;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @Length(1, 80)
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @Length(1, 80)
  lastName: string;

  @Matches(/^[0-9]{8,15}$/, { message: 'Mobile must be 8–15 digits' })
  mobile: string;

  @IsDateString(
    {},
    { message: 'installationDate must be an ISO date (YYYY-MM-DD)' },
  )
  installationDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Installation time is required' })
  installationTime: string;

  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  agreedToTerms: boolean;
}
