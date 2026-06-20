import { IsBoolean } from 'class-validator';

export class UpdateBlockedDto {
  @IsBoolean({ message: 'blocked must be a boolean' })
  blocked: boolean;
}
