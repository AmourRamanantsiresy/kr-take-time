import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username may only contain letters, digits, _ . -',
  })
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
