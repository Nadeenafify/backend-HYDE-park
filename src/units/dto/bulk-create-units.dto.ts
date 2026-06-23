import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { UnitType } from '../entities/unit.entity';

export class ImportUnitDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  description?: string;
}

export class BulkCreateUnitsDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportUnitDto)
  units: ImportUnitDto[];
}
