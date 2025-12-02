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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../prisma/prisma.service");
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD ?? 'Process123*';
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const passwordToHash = data.password ?? DEFAULT_PASSWORD;
        const hash = await bcrypt.hash(passwordToHash, SALT_ROUNDS);
        const user = await this.prisma.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                password: hash,
                roleId: data.roleId,
                unitId: data.unitId,
                avatarColor: data.avatarColor,
                title: data.title,
                phone: data.phone,
                about: data.about,
            },
            include: { role: { include: { permissions: true } }, unit: true },
        });
        return this.sanitize(user);
    }
    async findAll(roleKey, unitId) {
        const users = await this.prisma.user.findMany({
            where: {
                ...(roleKey ? { role: { key: roleKey } } : {}),
                ...(unitId ? { unitId } : {}),
            },
            include: { role: { include: { permissions: true } }, unit: true },
            orderBy: { fullName: 'asc' },
        });
        return users.map((user) => this.sanitize(user));
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: { include: { permissions: true } }, unit: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return this.sanitize(user);
    }
    async update(id, data) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Usuario no encontrado');
        const updateData = { ...data };
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS);
        }
        const user = await this.prisma.user.update({
            where: { id },
            data: updateData,
            include: { role: { include: { permissions: true } }, unit: true },
        });
        return this.sanitize(user);
    }
    async updateProfile(userId, data) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing)
            throw new common_1.NotFoundException('Usuario no encontrado');
        const updateData = {
            fullName: data.fullName,
            email: data.email,
            avatarColor: data.avatarColor,
            title: data.title,
            phone: data.phone,
            about: data.about,
        };
        if (data.unitId === null) {
            updateData.unit = { disconnect: true };
        }
        else if (data.unitId) {
            updateData.unit = { connect: { id: data.unitId } };
        }
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS);
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { role: { include: { permissions: true } }, unit: true },
        });
        return this.sanitize(user);
    }
    async remove(id) {
        await this.prisma.user.delete({ where: { id } });
        return { deleted: true };
    }
    async listRoles() {
        const roles = await this.prisma.role.findMany({
            include: { permissions: true },
            orderBy: { name: 'asc' },
        });
        return roles.map((role) => ({
            id: role.id,
            key: role.key,
            name: role.name,
            description: role.description,
            permissions: role.permissions.map((perm) => perm.value),
        }));
    }
    async listUnits() {
        return this.prisma.unit.findMany({
            include: {
                lead: {
                    select: { id: true, fullName: true },
                },
                parent: { select: { id: true, name: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createUnit(dto) {
        return this.prisma.unit.create({
            data: {
                name: dto.name,
                parentId: dto.parentId,
                leadId: dto.leadId,
            },
        });
    }
    async updateUnit(id, dto) {
        const existing = await this.prisma.unit.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Unidad no encontrada');
        if (dto.leadId) {
            const user = await this.prisma.user.findUnique({ where: { id: dto.leadId } });
            if (!user)
                throw new common_1.NotFoundException('El líder indicado no existe');
        }
        return this.prisma.unit.update({
            where: { id },
            data: {
                name: dto.name ?? existing.name,
                parentId: dto.parentId ?? existing.parentId,
                leadId: dto.leadId === null ? null : dto.leadId ?? existing.leadId,
            },
        });
    }
    async removeUnit(id) {
        const usage = await this.prisma.user.count({ where: { unitId: id } });
        const flows = await this.prisma.flowInstance.count({ where: { ownerUnitId: id } });
        if (usage > 0 || flows > 0) {
            throw new common_1.NotFoundException('No se puede eliminar: unidad en uso por usuarios o flujos');
        }
        await this.prisma.unit.delete({ where: { id } });
        return { deleted: true };
    }
    sanitize(user) {
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatarColor: user.avatarColor,
            title: user.title,
            phone: user.phone,
            about: user.about,
            workload: user.workload,
            lastLogin: user.lastLogin,
            roleId: user.roleId,
            unitId: user.unitId ?? null,
            role: {
                id: user.role.id,
                key: user.role.key,
                name: user.role.name,
                permissions: user.role.permissions.map((perm) => perm.value),
            },
            unit: user.unit,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map