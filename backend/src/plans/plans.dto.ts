import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsInt()
  @Min(1)
  duration_minutes: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  device_limit: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  device_limit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
