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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TasksService = class TasksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                ownerId: dto.ownerId,
                assignerId: dto.assignerId,
                priority: dto.priority,
                deadline: new Date(dto.deadline),
                flowInstanceId: dto.flowInstanceId,
                tags: {
                    create: (dto.tags ?? []).map((value) => ({ value })),
                },
                subTasks: dto.subTasks
                    ? {
                        create: dto.subTasks.map((sub) => ({
                            title: sub.title,
                            assigneeId: sub.assigneeId,
                            deadline: new Date(sub.deadline),
                            status: sub.status ?? client_1.TaskStatus.PENDING,
                        })),
                    }
                    : undefined,
            },
            include: this.defaultInclude(),
        });
        return this.mapTask(task);
    }
    async findAll(params) {
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
    async findOne(id) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: this.defaultInclude(),
        });
        if (!task)
            throw new common_1.NotFoundException('Tarea no encontrada');
        return this.mapTask(task);
    }
    async update(id, dto) {
        await this.ensureTask(id);
        const updateData = {
            title: dto.title,
            description: dto.description,
            priority: dto.priority,
            deadline: dto.deadline ? new Date(dto.deadline) : undefined,
            flowInstance: dto.flowInstanceId ? { connect: { id: dto.flowInstanceId } } : undefined,
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
        return this.mapTask(task);
    }
    async updateStatus(id, dto, performedById) {
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
        return this.mapTask(task);
    }
    async reportProblem(id, dto, reporterId) {
        await this.ensureTask(id);
        return this.prisma.taskProblem.create({
            data: {
                taskId: id,
                description: dto.description,
                reporterId,
            },
        });
    }
    async resolveProblem(problemId, dto, resolverId) {
        const problem = await this.prisma.taskProblem.findUnique({ where: { id: problemId } });
        if (!problem)
            throw new common_1.NotFoundException('Problema no encontrado');
        await this.prisma.taskProblem.update({
            where: { id: problemId },
            data: {
                status: client_1.ProblemStatus.RESOLVED,
                resolvedAt: new Date(),
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
    async addSubTask(taskId, dto) {
        await this.ensureTask(taskId);
        return this.prisma.subTask.create({
            data: {
                taskId,
                title: dto.title,
                assigneeId: dto.assigneeId,
                deadline: new Date(dto.deadline),
                status: dto.status ?? client_1.TaskStatus.PENDING,
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
        const capacities = users.reduce((acc, user) => {
            acc[user.id] = user.workload || 10;
            return acc;
        }, {});
        const result = tasks.reduce((acc, row) => {
            const entry = acc[row.ownerId] ?? {
                ownerId: row.ownerId,
                assigned: 0,
                inProgress: 0,
                blocked: 0,
                overdue: 0,
            };
            entry.assigned += row._count;
            if (row.status === client_1.TaskStatus.IN_PROGRESS)
                entry.inProgress += row._count;
            if (row.status === client_1.TaskStatus.BLOCKED)
                entry.blocked += row._count;
            acc[row.ownerId] = entry;
            return acc;
        }, {});
        const overdue = await this.prisma.task.findMany({
            where: {
                deadline: { lt: new Date() },
                status: { not: client_1.TaskStatus.COMPLETED },
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
                    { status: client_1.TaskStatus.BLOCKED },
                    {
                        AND: [
                            { status: { not: client_1.TaskStatus.COMPLETED } },
                            { deadline: { lt: new Date() } },
                        ],
                    },
                ],
            },
            include: this.defaultInclude(),
        });
        return tasks.map((task) => this.mapTask(task));
    }
    async ensureTask(id) {
        const exists = await this.prisma.task.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Tarea no encontrada');
    }
    defaultInclude() {
        return {
            tags: true,
            owner: { select: { id: true, fullName: true } },
            assigner: { select: { id: true, fullName: true } },
            subTasks: true,
            problems: true,
            flowInstance: { select: { id: true, name: true } },
            dependencies: { select: { dependsOnId: true } },
            dependents: { select: { taskId: true } },
            histories: true,
        };
    }
    mapTask(task) {
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
            assigner: task.assigner,
            flowInstance: task.flowInstance,
            tags: task.tags?.map((tag) => tag.value) ?? [],
            subTasks: task.subTasks?.map((subTask) => ({
                id: subTask.id,
                title: subTask.title,
                status: this.lowerCaseEnum(subTask.status),
                assigneeId: subTask.assigneeId,
                progress: subTask.progress,
                deadline: subTask.deadline,
            })) ?? [],
            problems: task.problems?.map((problem) => ({
                id: problem.id,
                description: problem.description,
                status: this.lowerCaseEnum(problem.status),
                createdAt: problem.createdAt,
                resolvedAt: problem.resolvedAt,
                reporterId: problem.reporterId,
                taskId: problem.taskId,
            })) ?? [],
            history: task.histories?.map((entry) => ({
                id: entry.id,
                taskId: entry.taskId,
                action: entry.action,
                notes: entry.notes,
                timestamp: entry.timestamp,
                performedBy: entry.performedById,
            })) ?? [],
            dependencies: task.dependencies?.map((dep) => dep.dependsOnId) ?? [],
            relatedTaskIds: task.dependents?.map((dep) => dep.taskId) ?? [],
        };
    }
    lowerCaseEnum(value) {
        return value ? String(value).toLowerCase() : value;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map