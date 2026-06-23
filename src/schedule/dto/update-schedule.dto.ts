import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ScheduleMode } from '../entities/schedule.entity';

export class DayScheduleDto {
  @IsBoolean()
  open: boolean;

  @IsArray()
  @IsString({ each: true })
  @Length(1, 20, { each: true })
  slots: string[];
}

export class UpdateScheduleDto {
  @IsIn(['global', 'perDay'])
  mode: ScheduleMode;

  @IsArray()
  @IsString({ each: true })
  @Length(1, 20, { each: true })
  globalSlots: string[];

  /** Must be exactly 7 entries, indexed Sunday(0) … Saturday(6). */
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  days: DayScheduleDto[];
}
