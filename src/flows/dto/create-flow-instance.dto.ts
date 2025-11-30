import { IsDateString, IsString } from 'class-validator';

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
}
