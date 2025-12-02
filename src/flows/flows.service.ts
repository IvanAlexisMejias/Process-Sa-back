import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFlowTemplateDto } from './dto/create-flow-template.dto';
import { CreateFlowInstanceDto } from './dto/create-flow-instance.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto';
import { TaskPriority, TaskStatus } from '@prisma/client';

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

    return this.mapInstance(instance);
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

    const recalculated = await this.recalculateInstanceProgress(instanceId);
    return recalculated;
  }

  async deleteTemplate(id: string) {
    const instanceCount = await this.prisma.flowInstance.count({ where: { templateId: id } });
    if (instanceCount > 0) {
      throw new BadRequestException('No se puede eliminar una plantilla con instancias activas.');
    }
    await this.prisma.$transaction([
      this.prisma.flowStage.deleteMany({ where: { templateId: id } }),
      this.prisma.flowTemplate.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  async deleteInstance(id: string) {
    await this.prisma.$transaction([
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
    const instance = await this.prisma.flowInstance.findUnique({
      where: { id: instanceId },
      include: { stageStatuses: true, template: { include: { stages: true } }, ownerUnit: true },
    });
    if (!instance) throw new NotFoundException('Flujo no encontrado');

    const totalStages = instance.stageStatuses.length || 1;
    const progress =
      instance.stageStatuses.reduce((acc, curr) => acc + curr.progress, 0) / totalStages;
    const health =
      instance.stageStatuses.some((stage) => stage.status === TaskStatus.BLOCKED)
        ? 'AT_RISK'
        : progress >= 80
          ? 'ON_TRACK'
          : 'AT_RISK';

    const updated = await this.prisma.flowInstance.update({
      where: { id: instanceId },
      data: {
        progress: Math.round(progress),
        health,
      },
      include: this.instanceInclude(),
    });
    return this.mapInstance(updated);
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

  private mapInstance(instance: any) {
    return {
      id: instance.id,
      name: instance.name,
      health: instance.health,
      progress: instance.progress,
      kickoffDate: instance.kickoffDate,
      dueDate: instance.dueDate,
      templateId: instance.templateId,
      ownerUnitId: instance.ownerUnitId,
      template: instance.template,
      ownerUnit: instance.ownerUnit,
      stageStatuses: instance.stageStatuses.map((stageStatus) => ({
        id: stageStatus.id,
        status: stageStatus.status,
        progress: stageStatus.progress,
        owner: stageStatus.owner,
        stage: stageStatus.stage,
      })),
    };
  }
}
