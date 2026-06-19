import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class ImportUnitDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code: string;

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
