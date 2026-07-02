import { IsInt, Min } from 'class-validator';

export class CreateRequestDto {
  @IsInt()
  @Min(1)
  plan_id: number;
}
