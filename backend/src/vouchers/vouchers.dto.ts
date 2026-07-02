import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class RedeemVoucherDto {
  @IsString()
  @Matches(/^[A-Za-z0-9-]{4,64}$/, { message: 'invalid voucher code format' })
  code: string;
}

export class GenerateVouchersDto {
  @IsInt()
  @Min(1)
  @Max(500)
  count: number;

  @IsInt()
  @Min(1)
  duration_minutes: number;

  @IsInt()
  @Min(1)
  device_limit: number;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
