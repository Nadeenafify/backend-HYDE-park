import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
