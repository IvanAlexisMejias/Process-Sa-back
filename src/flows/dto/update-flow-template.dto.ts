import { PartialType } from '@nestjs/mapped-types';
import { CreateFlowTemplateDto } from './create-flow-template.dto';

export class UpdateFlowTemplateDto extends PartialType(CreateFlowTemplateDto) {}
