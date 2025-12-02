import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '@prisma/client';
import { CreateSubTaskDto } from './create-subtask.dto';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @IsString()
  ownerId: string;

  @IsString()
  assignerId: string;

  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsString()
  flowInstanceId?: string;

  @IsOptional()
  @IsString()
  stageStatusId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubTaskDto)
  subTasks?: CreateSubTaskDto[];
}
