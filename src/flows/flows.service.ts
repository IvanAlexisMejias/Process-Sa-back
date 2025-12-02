import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFlowTemplateDto } from './dto/create-flow-template.dto';
import { CreateFlowInstanceDto } from './dto/create-flow-instance.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { UpdateFlowTemplateDto } from './dto/update-flow-template.dto';
import { deriveStateFromStages, recalcAndPersistFlowProgress, FlowState } from './flow-progress.util';

@Injectable()
export class FlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateFlowTemplateDto) {
    const template = await this.prisma.flowTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        businessObjective: dto.businessObjective,
        typicalDurationDays: dto.typicalDurationDays,
        ownerId: dto.ownerId,
        stages: {
          create: dto.stages.map((stage, idx) => ({
            name: stage.name,
            description: stage.description,
            expectedDurationDays: stage.expectedDurationDays,
            exitCriteria: stage.exitCriteria,
            ownerRole: stage.ownerRole,
          })),
        },
      },
      include: { stages: true },
    });
    return template;
  }

  async listTemplates() {
    return this.prisma.flowTemplate.findMany({
      include: { stages: true, owner: { select: { id: true, fullName: true } } },
    });
  }

  async updateTemplate(id: string, dto: UpdateFlowTemplateDto) {
    const existing = await this.prisma.flowTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plantilla no encontrada');
    await this.prisma.flowTemplate.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        businessObjective: dto.businessObjective ?? existing.businessObjective,
        typicalDurationDays: dto.typicalDurationDays ?? existing.typicalDurationDays,
        ownerId: dto.ownerId ?? existing.ownerId,
      },
    });
    if (dto.stages) {
      await this.prisma.flowStage.deleteMany({ where: { templateId: id } });
      await this.prisma.flowStage.createMany({
        data: dto.stages.map((stage) => ({
          templateId: id,
          name: stage.name,
          description: stage.description,
          expectedDurationDays: stage.expectedDurationDays,
          exitCriteria: stage.exitCriteria,
          ownerRole: stage.ownerRole,
        })),
      });
    }
    return this.prisma.flowTemplate.findUnique({
      where: { id },
      include: { stages: true, owner: { select: { id: true, fullName: true } } },
    });
  }

  async createInstance(dto: CreateFlowInstanceDto) {
    const template = await this.prisma.flowTemplate.findUnique({
      where: { id: dto.templateId },
      include: { stages: true },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    const fallbackOwner = await this.prisma.user.findFirst({
      select: { id: true },
      orderBy: { fullName: 'asc' },
    });

    const stageStatuses = await Promise.all(
      template.stages.map(async (stage) => {
        const owner = await this.prisma.user.findFirst({
          where: { role: { key: stage.ownerRole } },
          select: { id: true },
        });
        return {
          stageId: stage.id,
          ownerId: owner?.id ?? fallbackOwner?.id ?? template.ownerId,
        };
      }),
    );

    const instance = await this.prisma.flowInstance.create({
      data: {
        name: dto.name,
        templateId: dto.templateId,
        ownerUnitId: dto.ownerUnitId,
        kickoffDate: new Date(dto.kickoffDate),
        dueDate: new Date(dto.dueDate),
        stageStatuses: {
          create: stageStatuses.map((stage) => ({
            stageId: stage.stageId,
            ownerId: stage.ownerId,
          })),
        },
      },
      include: this.instanceInclude(),
    });
    const stageOwnerByStageId = instance.stageStatuses.reduce<Record<string, string | undefined>>(
      (acc, stageStatus) => ({ ...acc, [stageStatus.stageId]: stageStatus.ownerId }),
      {},
    );
    const stageStatusByStageId = instance.stageStatuses.reduce<Record<string, string>>(
      (acc, stageStatus) => ({ ...acc, [stageStatus.stageId]: stageStatus.id }),
      {},
    );

    if (dto.stageTasks?.length) {
      for (const stageTaskGroup of dto.stageTasks) {
        const stage = template.stages.find((item) => item.id === stageTaskGroup.stageId);
        if (!stage) continue;
        for (const task of stageTaskGroup.tasks) {
          await this.prisma.task.create({
            data: {
              title: task.title,
              description: task.description ?? '',
              priority: task.priority ?? TaskPriority.MEDIUM,
              ownerId: task.ownerId ?? stageOwnerByStageId[stage.id] ?? template.ownerId,
              assignerId: template.ownerId,
              flowInstanceId: instance.id,
              stageStatusId: stageStatusByStageId[stage.id],
              deadline: new Date(
                new Date(dto.kickoffDate).getTime() +
                  24 * 60 * 60 * 1000 * (task.dueInDays ?? stage.expectedDurationDays ?? 1),
              ),
              allowRejection: true,
            },
          });
        }
      }
    }

    const recalculated = await recalcAndPersistFlowProgress(this.prisma, instance.id);
    return this.mapInstance(recalculated.flow, recalculated.state);
  }

  async listInstances() {
    const instances = await this.prisma.flowInstance.findMany({
      include: this.instanceInclude(),
    });
    return instances.map((instance) => this.mapInstance(instance));
  }

  async updateStageStatus(instanceId: string, stageId: string, dto: UpdateStageStatusDto) {
    const stageStatus = await this.prisma.flowStageStatus.findFirst({
      where: { instanceId, stageId },
    });
    if (!stageStatus) throw new NotFoundException('Etapa no encontrada');

    await this.prisma.flowStageStatus.update({
      where: { id: stageStatus.id },
      data: {
        status: dto.status,
        progress: dto.progress ?? undefined,
        ownerId: dto.ownerId ?? stageStatus.ownerId,
      },
    });

    const recalculated = await recalcAndPersistFlowProgress(this.prisma, instanceId);
    return this.mapInstance(recalculated.flow, recalculated.state);
  }

  async deleteTemplate(id: string) {
    const instances = await this.prisma.flowInstance.findMany({
      where: { templateId: id },
      select: { id: true },
    });

    const instanceIds = instances.map((inst) => inst.id);

    await this.prisma.$transaction([
      // limpiar datos dependientes de las tareas de las instancias
      this.prisma.taskTag.deleteMany({ where: { task: { flowInstanceId: { in: instanceIds } } } }),
      this.prisma.taskHistory.deleteMany({ where: { task: { flowInstanceId: { in: instanceIds } } } }),
      this.prisma.taskProblem.deleteMany({ where: { task: { flowInstanceId: { in: instanceIds } } } }),
      this.prisma.subTask.deleteMany({ where: { task: { flowInstanceId: { in: instanceIds } } } }),
      this.prisma.taskDependency.deleteMany({
        where: {
          OR: [
            { task: { flowInstanceId: { in: instanceIds } } },
            { dependsOn: { flowInstanceId: { in: instanceIds } } },
          ],
        },
      }),
      this.prisma.notification.deleteMany({ where: { flowInstanceId: { in: instanceIds } } }),
      this.prisma.task.deleteMany({ where: { flowInstanceId: { in: instanceIds } } }),
      this.prisma.flowStageStatus.deleteMany({ where: { instanceId: { in: instanceIds } } }),
      this.prisma.flowInstance.deleteMany({ where: { id: { in: instanceIds } } }),
      this.prisma.flowStage.deleteMany({ where: { templateId: id } }),
      this.prisma.flowTemplate.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  async deleteInstance(id: string) {
    await this.prisma.$transaction([
      this.prisma.taskTag.deleteMany({ where: { task: { flowInstanceId: id } } }),
      this.prisma.taskHistory.deleteMany({ where: { task: { flowInstanceId: id } } }),
      this.prisma.taskProblem.deleteMany({ where: { task: { flowInstanceId: id } } }),
      this.prisma.subTask.deleteMany({ where: { task: { flowInstanceId: id } } }),
      this.prisma.taskDependency.deleteMany({
        where: {
          OR: [
            { task: { flowInstanceId: id } },
            { dependsOn: { flowInstanceId: id } },
          ],
        },
      }),
      this.prisma.notification.deleteMany({ where: { flowInstanceId: id } }),
      this.prisma.task.deleteMany({ where: { flowInstanceId: id } }),
      this.prisma.flowStageStatus.deleteMany({ where: { instanceId: id } }),
      this.prisma.flowInstance.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  async dashboard() {
    const [instances, tasks] = await Promise.all([
      this.listInstances(),
      this.prisma.task.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const taskSummary = tasks.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.status]: curr._count,
      }),
      {},
    );
    return { instances, taskSummary };
  }

  private async recalculateInstanceProgress(instanceId: string) {
    const recalculated = await recalcAndPersistFlowProgress(this.prisma, instanceId);
    return this.mapInstance(recalculated.flow, recalculated.state);
  }

  private instanceInclude() {
    return {
      template: { select: { id: true, name: true } },
      ownerUnit: { select: { id: true, name: true } },
      stageStatuses: {
        include: {
          stage: true,
          owner: { select: { id: true, fullName: true } },
        },
      },
    };
  }

  private mapInstance(instance: any, stateOverride?: FlowState) {
    const stageStatuses = instance.stageStatuses.map((stageStatus: any) => ({
      id: stageStatus.id,
      status: stageStatus.status,
      progress: stageStatus.progress,
      owner: stageStatus.owner,
      stage: stageStatus.stage,
    }));
    const state = stateOverride ?? deriveStateFromStages(stageStatuses);
    return {
      id: instance.id,
      name: instance.name,
      health: instance.health,
      state,
      progress: instance.progress,
      kickoffDate: instance.kickoffDate,
      dueDate: instance.dueDate,
      templateId: instance.templateId,
      ownerUnitId: instance.ownerUnitId,
      template: instance.template,
      ownerUnit: instance.ownerUnit,
      stageStatuses,
    };
  }
}
