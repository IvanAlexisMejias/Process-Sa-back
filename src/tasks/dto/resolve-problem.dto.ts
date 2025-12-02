import { IsOptional, IsString } from 'class-validator';

export class ResolveProblemDto {
  @IsOptional()
  @IsString()
  resolution?: string;
}
