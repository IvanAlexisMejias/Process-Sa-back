"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let FlowsService = class FlowsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTemplate(dto) {
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
    async updateTemplate(id, dto) {
        const existing = await this.prisma.flowTemplate.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Plantilla no encontrada');
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
    async createInstance(dto) {
        const template = await this.prisma.flowTemplate.findUnique({
            where: { id: dto.templateId },
            include: { stages: true },
        });
        if (!template)
            throw new common_1.NotFoundException('Plantilla no encontrada');
        const fallbackOwner = await this.prisma.user.findFirst({
            select: { id: true },
            orderBy: { fullName: 'asc' },
        });
        const stageStatuses = await Promise.all(template.stages.map(async (stage) => {
            const owner = await this.prisma.user.findFirst({
                where: { role: { key: stage.ownerRole } },
                select: { id: true },
            });
            return {
                stageId: stage.id,
                ownerId: owner?.id ?? fallbackOwner?.id ?? template.ownerId,
            };
        }));
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
        const stageOwnerByStageId = instance.stageStatuses.reduce((acc, stageStatus) => ({ ...acc, [stageStatus.stageId]: stageStatus.ownerId }), {});
        if (dto.stageTasks?.length) {
            for (const stageTaskGroup of dto.stageTasks) {
                const stage = template.stages.find((item) => item.id === stageTaskGroup.stageId);
                if (!stage)
                    continue;
                for (const task of stageTaskGroup.tasks) {
                    await this.prisma.task.create({
                        data: {
                            title: task.title,
                            description: task.description ?? '',
                            priority: task.priority ?? client_1.TaskPriority.MEDIUM,
                            ownerId: task.ownerId ?? stageOwnerByStageId[stage.id] ?? template.ownerId,
                            assignerId: template.ownerId,
                            flowInstanceId: instance.id,
                            deadline: new Date(new Date(dto.kickoffDate).getTime() +
                                24 * 60 * 60 * 1000 * (task.dueInDays ?? stage.expectedDurationDays ?? 1)),
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
    async updateStageStatus(instanceId, stageId, dto) {
        const stageStatus = await this.prisma.flowStageStatus.findFirst({
            where: { instanceId, stageId },
        });
        if (!stageStatus)
            throw new common_1.NotFoundException('Etapa no encontrada');
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
    async deleteTemplate(id) {
        const instances = await this.prisma.flowInstance.findMany({
            where: { templateId: id },
            select: { id: true },
        });
        const instanceIds = instances.map((inst) => inst.id);
        await this.prisma.$transaction([
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
    async deleteInstance(id) {
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
        const taskSummary = tasks.reduce((acc, curr) => ({
            ...acc,
            [curr.status]: curr._count,
        }), {});
        return { instances, taskSummary };
    }
    async recalculateInstanceProgress(instanceId) {
        const instance = await this.prisma.flowInstance.findUnique({
            where: { id: instanceId },
            include: { stageStatuses: true, template: { include: { stages: true } }, ownerUnit: true },
        });
        if (!instance)
            throw new common_1.NotFoundException('Flujo no encontrado');
        const totalStages = instance.stageStatuses.length || 1;
        const progress = instance.stageStatuses.reduce((acc, curr) => acc + curr.progress, 0) / totalStages;
        const health = instance.stageStatuses.some((stage) => stage.status === client_1.TaskStatus.BLOCKED)
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
    instanceInclude() {
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
    mapInstance(instance) {
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
};
exports.FlowsService = FlowsService;
exports.FlowsService = FlowsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FlowsService);
//# sourceMappingURL=flows.service.js.map