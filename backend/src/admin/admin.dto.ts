import { IsInt, IsOptional, Min } from 'class-validator';

export class GrantTimeDto {
  @IsInt()
  @Min(1)
  minutes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  device_limit?: number;
}
