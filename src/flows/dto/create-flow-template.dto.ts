import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleKey } from '@prisma/client';

class FlowStageInput {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsInt()
  @Min(1)
  expectedDurationDays: number;

  @IsString()
  exitCriteria: string;

  @IsString()
  ownerRole: RoleKey;
}

export class CreateFlowTemplateDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  businessObjective: string;

  @IsInt()
  @Min(1)
  typicalDurationDays: number;

  @IsString()
  ownerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FlowStageInput)
  stages: FlowStageInput[];
}
