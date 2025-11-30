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