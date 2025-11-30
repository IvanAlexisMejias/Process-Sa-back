import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class CreateSubTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsDateString()
  deadline: string;

  @IsString()
  assigneeId: string;
}
