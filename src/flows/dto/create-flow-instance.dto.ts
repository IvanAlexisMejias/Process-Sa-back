import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '@prisma/client';

class StageTaskInput {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsInt()
  @Min(1)
  dueInDays?: number;

  @IsOptional()
  @IsString()
  ownerId?: string;
}

class StageTaskGroupInput {
  @IsString()
  stageId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StageTaskInput)
  tasks: StageTaskInput[];
}

export class CreateFlowInstanceDto {
  @IsString()
  templateId: string;

  @IsString()
  name: string;

  @IsString()
  ownerUnitId: string;

  @IsDateString()
  kickoffDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageTaskGroupInput)
  stageTasks?: StageTaskGroupInput[];
}
