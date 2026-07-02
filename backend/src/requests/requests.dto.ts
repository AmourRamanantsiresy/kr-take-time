import { IsInt, IsOptional, Max, Min } from 'class-validator';

/* Either a predefined plan or a custom minute count — exactly one. */
export class CreateRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  plan_id?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  minutes?: number;
}
