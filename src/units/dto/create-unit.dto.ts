import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UnitType } from '../entities/unit.entity';

export class CreateUnitDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsEnum(UnitType)
  type: UnitType;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
