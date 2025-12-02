import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { CreateFlowTemplateDto } from './dto/create-flow-template.dto';
import { CreateFlowInstanceDto } from './dto/create-flow-instance.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto';
import { UpdateFlowTemplateDto } from './dto/update-flow-template.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Roles('DESIGNER', 'ADMIN')
  @Post('templates')
  createTemplate(@Body() dto: CreateFlowTemplateDto) {
    return this.flowsService.createTemplate(dto);
  }

  @Get('templates')
  listTemplates() {
    return this.flowsService.listTemplates();
  }

  @Roles('DESIGNER', 'ADMIN')
  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateFlowTemplateDto) {
    return this.flowsService.updateTemplate(id, dto);
  }

  @Roles('DESIGNER', 'ADMIN')
  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.flowsService.deleteTemplate(id);
  }

  @Roles('DESIGNER', 'ADMIN')
  @Post('instances')
  createInstance(@Body() dto: CreateFlowInstanceDto) {
    return this.flowsService.createInstance(dto);
  }

  @Get('instances')
  listInstances() {
    return this.flowsService.listInstances();
  }

  @Roles('DESIGNER', 'ADMIN')
  @Delete('instances/:id')
  deleteInstance(@Param('id') id: string) {
    return this.flowsService.deleteInstance(id);
  }

  @Roles('DESIGNER', 'ADMIN')
  @Patch('instances/:instanceId/stages/:stageId')
  updateStage(
    @Param('instanceId') instanceId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageStatusDto,
  ) {
    return this.flowsService.updateStageStatus(instanceId, stageId, dto);
  }

  @Get('dashboard')
  dashboard() {
    return this.flowsService.dashboard();
  }
}
