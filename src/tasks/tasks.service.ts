import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { ReportProblemDto } from './dto/report-problem.dto';
import { CreateSubTaskDto } from './dto/create-subtask.dto';
import { ResolveProblemDto } from './dto/resolve-problem.dto';
import { Prisma, TaskPriority, TaskStatus, ProblemStatus } from '@prisma/client';
import { recalcAndPersistFlowProgress } from '@/flows/flow-progress.util';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        ownerId: dto.ownerId,
        assignerId: dto.assignerId,
        priority: dto.priority,
      deadline: new Date(dto.deadline),
      flowInstanceId: dto.flowInstanceId,
      stageStatusId: dto.stageStatusId,
      tags: {
        create: (dto.tags ?? []).map((value) => ({ value })),
      },
        subTasks: dto.subTasks
          ? {
              create: dto.subTasks.map((sub) => ({
                title: sub.title,
                assigneeId: sub.assigneeId,
                deadline: new Date(sub.deadline),
                status: sub.status ?? TaskStatus.PENDING,
              })),
            }
          : undefined,
      },
      include: this.defaultInclude(),
    });
    if (task.flowInstanceId) {
      await this.syncFlowProgress(task.flowInstanceId);
    }
    return this.mapTask(task);
  }

  async findAll(params: { status?: TaskStatus; ownerId?: string; assignerId?: string }) {
    const tasks = await this.prisma.task.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.ownerId ? { ownerId: params.ownerId } : {}),
        ...(params.assignerId ? { assignerId: params.assignerId } : {}),
      },
      include: this.defaultInclude(),
      orderBy: { deadline: 'asc' },
    });
    return tasks.map((task) => this.mapTask(task));
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    return this.mapTask(task);
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.ensureTask(id);
    const updateData: Prisma.TaskUpdateInput = {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      flowInstance: dto.flowInstanceId ? { connect: { id: dto.flowInstanceId } } : undefined,
      stageStatus: dto.stageStatusId ? { connect: { id: dto.stageStatusId } } : undefined,
      owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      assigner: dto.assignerId ? { connect: { id: dto.assignerId } } : undefined,
      progress: typeof dto.progress === 'number' ? dto.progress : undefined,
    };

    if (dto.tags) {
      updateData.tags = {
        deleteMany: {},
        create: dto.tags.map((value) => ({ value })),
      };
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: this.defaultInclude(),
    });
    if (task.flowInstanceId) {
      await this.syncFlowProgress(task.flowInstanceId);
    }
    return this.mapTask(task);
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, performedById: string) {
    await this.ensureTask(id);
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        progress: dto.progress ?? undefined,
        histories: {
          create: {
            action: `Estado actualizado a ${dto.status}`,
            performedById,
          },
        },
      },
      include: this.defaultInclude(),
    });
    if (task.flowInstanceId) {
      await this.syncFlowProgress(task.flowInstanceId);
    }
    return this.mapTask(task);
  }

  async reportProblem(id: string, dto: ReportProblemDto, reporterId: string) {
    await this.ensureTask(id);
    return this.prisma.taskProblem.create({
      data: {
        taskId: id,
        description: dto.description,
        reporterId,
      },
      include: { reporter: { select: { id: true, fullName: true } } },
    });
  }

  async resolveProblem(problemId: string, dto: ResolveProblemDto, resolverId: string) {
    const problem = await this.prisma.taskProblem.findUnique({ where: { id: problemId } });
    if (!problem) throw new NotFoundException('Problema no encontrado');
    await this.prisma.taskProblem.update({
      where: { id: problemId },
      data: {
        status: ProblemStatus.RESOLVED,
        resolvedAt: new Date(),
        resolution: dto.resolution,
      },
    });
    await this.prisma.taskHistory.create({
      data: {
        taskId: problem.taskId,
        action: dto.resolution ? `Problema resuelto: ${dto.resolution}` : 'Problema marcado como resuelto',
        performedById: resolverId,
      },
    });
    return { resolved: true };
  }

  async addSubTask(taskId: string, dto: CreateSubTaskDto) {
    await this.ensureTask(taskId);
    return this.prisma.subTask.create({
      data: {
        taskId,
        title: dto.title,
        assigneeId: dto.assigneeId,
        deadline: new Date(dto.deadline),
        status: dto.status ?? TaskStatus.PENDING,
      },
    });
  }

  async workloadSummary() {
    const [tasks, users] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['ownerId', 'status'],
        _count: true,
      }),
      this.prisma.user.findMany({
        select: { id: true, workload: true },
      }),
    ]);

    const capacities = users.reduce<Record<string, number>>((acc, user) => {
      acc[user.id] = user.workload || 10;
      return acc;
    }, {});

    const result = tasks.reduce<Record<string, any>>((acc, row) => {
      const entry = acc[row.ownerId] ?? {
        ownerId: row.ownerId,
        assigned: 0,
        inProgress: 0,
        blocked: 0,
        overdue: 0,
      };
      entry.assigned += row._count;
      if (row.status === TaskStatus.IN_PROGRESS) entry.inProgress += row._count;
      if (row.status === TaskStatus.BLOCKED) entry.blocked += row._count;
      acc[row.ownerId] = entry;
      return acc;
    }, {});

    const overdue = await this.prisma.task.findMany({
      where: {
        deadline: { lt: new Date() },
        status: { not: TaskStatus.COMPLETED },
      },
      select: { ownerId: true },
    });
    overdue.forEach((task) => {
      if (!result[task.ownerId]) {
        result[task.ownerId] = { ownerId: task.ownerId, assigned: 0, inProgress: 0, blocked: 0, overdue: 0 };
      }
      result[task.ownerId].overdue += 1;
    });
    return Object.values(result).map((entry) => ({
      userId: entry.ownerId,
      assigned: entry.assigned,
      inProgress: entry.inProgress,
      blocked: entry.blocked,
      overdue: entry.overdue,
      capacity: capacities[entry.ownerId] || Math.max(entry.assigned, 1),
    }));
  }

  async alerts() {
    const tasks = await this.prisma.task.findMany({
      where: {
        OR: [
          { status: TaskStatus.BLOCKED },
          {
            AND: [
              { status: { not: TaskStatus.COMPLETED } },
              { deadline: { lt: new Date() } },
            ],
          },
        ],
      },
      include: this.defaultInclude(),
    });
    return tasks.map((task) => this.mapTask(task));
  }

  private async ensureTask(id: string) {
    const exists = await this.prisma.task.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Tarea no encontrada');
  }

  private async syncFlowProgress(flowInstanceId: string) {
    await recalcAndPersistFlowProgress(this.prisma, flowInstanceId);
  }

  private defaultInclude() {
    return {
      tags: true,
      owner: { select: { id: true, fullName: true, unitId: true } },
      assigner: { select: { id: true, fullName: true } },
      subTasks: true,
      problems: true,
      flowInstance: { select: { id: true, name: true, ownerUnitId: true, ownerUnit: { select: { id: true, name: true } } } },
      dependencies: { select: { dependsOnId: true } },
      dependents: { select: { taskId: true } },
      histories: { include: { performedBy: { select: { id: true, fullName: true } } } },
    };
  }

  private mapTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: this.lowerCaseEnum(task.status),
      priority: this.lowerCaseEnum(task.priority),
      ownerId: task.ownerId,
      assignerId: task.assignerId,
      flowInstanceId: task.flowInstanceId,
      deadline: task.deadline,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      progress: task.progress,
      durationDays: task.durationDays,
      allowRejection: task.allowRejection,
      owner: task.owner,
      stageStatusId: task.stageStatusId ?? null,
      ownerUnitId: task.owner?.unitId ?? task.flowInstance?.ownerUnitId ?? null,
      assigner: task.assigner,
      flowInstance: task.flowInstance,
      tags: task.tags?.map((tag) => tag.value) ?? [],
      subTasks:
        task.subTasks?.map((subTask) => ({
          id: subTask.id,
          title: subTask.title,
          status: this.lowerCaseEnum(subTask.status),
          assigneeId: subTask.assigneeId,
          progress: subTask.progress,
          deadline: subTask.deadline,
        })) ?? [],
      problems:
        task.problems?.map((problem) => ({
          id: problem.id,
          description: problem.description,
          status: this.lowerCaseEnum(problem.status),
          createdAt: problem.createdAt,
          resolvedAt: problem.resolvedAt,
          reporterId: problem.reporterId,
          taskId: problem.taskId,
        })) ?? [],
      history:
        task.histories?.map((entry) => ({
          id: entry.id,
        taskId: entry.taskId,
        action: entry.action,
        notes: entry.notes,
        timestamp: entry.timestamp,
        performedBy: entry.performedById,
        performedByName: entry.performedBy?.fullName,
      })) ?? [],
      dependencies: task.dependencies?.map((dep) => dep.dependsOnId) ?? [],
      relatedTaskIds: task.dependents?.map((dep) => dep.taskId) ?? [],
    };
  }

  private lowerCaseEnum(value?: TaskStatus | TaskPriority | ProblemStatus | string) {
    return value ? String(value).toLowerCase() : value;
  }
}
