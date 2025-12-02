import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { ReportProblemDto } from './dto/report-problem.dto';
import { CreateSubTaskDto } from './dto/create-subtask.dto';
import { ResolveProblemDto } from './dto/resolve-problem.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.tasksService.findAll({
      status: query.status,
      ownerId: query.ownerId,
      assignerId: query.assignerId,
    });
  }

  @Get('alerts')
  alerts() {
    return this.tasksService.alerts();
  }

  @Get('workload/summary')
  workload() {
    return this.tasksService.workloadSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateStatus(id, dto, user.userId);
  }

  @Post(':id/problems')
  reportProblem(
    @Param('id') id: string,
    @Body() dto: ReportProblemDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.reportProblem(id, dto, user.userId);
  }

  @Patch('problems/:problemId/resolve')
  resolveProblem(@Param('problemId') problemId: string, @Body() dto: ResolveProblemDto, @CurrentUser() user: any) {
    return this.tasksService.resolveProblem(problemId, dto, user.userId);
  }

  @Post(':id/subtasks')
  addSubTask(@Param('id') id: string, @Body() dto: CreateSubTaskDto) {
    return this.tasksService.addSubTask(id, dto);
  }
}
