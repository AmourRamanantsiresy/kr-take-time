import { IsIP, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ConnectDto {
  @IsIP()
  clientip: string;

  @Matches(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i, { message: 'invalid MAC address' })
  clientmac: string;

  @IsString()
  @MaxLength(128)
  hid: string;

  @IsString()
  @MaxLength(128)
  sig: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;
}
