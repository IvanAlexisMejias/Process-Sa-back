import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RoleKey } from '@prisma/client';
import { UpdateUnitDto } from './dto/update-unit.dto';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD ?? 'Process123*';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    const passwordToHash = data.password ?? DEFAULT_PASSWORD;
    const hash = await bcrypt.hash(passwordToHash, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hash,
        roleId: data.roleId,
        unitId: data.unitId,
      },
      include: { role: { include: { permissions: true } }, unit: true },
    });
    return this.sanitize(user);
  }

  async findAll(roleKey?: string, unitId?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(roleKey ? { role: { key: roleKey as RoleKey } } : {}),
        ...(unitId ? { unitId } : {}),
      },
      include: { role: { include: { permissions: true } }, unit: true },
      orderBy: { fullName: 'asc' },
    });
    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: { include: { permissions: true } }, unit: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitize(user);
  }

  async update(id: string, data: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');
    const updateData: any = { ...data };
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

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const updateData: any = {
      fullName: data.fullName,
      email: data.email,
      avatarColor: data.avatarColor,
    };

    if (data.unitId === null) {
      updateData.unit = { disconnect: true };
    } else if (data.unitId) {
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

  async remove(id: string) {
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

  async createUnit(dto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: {
        name: dto.name,
        parentId: dto.parentId,
        leadId: dto.leadId,
      },
    });
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    const existing = await this.prisma.unit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Unidad no encontrada');
    if (dto.leadId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.leadId } });
      if (!user) throw new NotFoundException('El líder indicado no existe');
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

  async removeUnit(id: string) {
    const usage = await this.prisma.user.count({ where: { unitId: id } });
    const flows = await this.prisma.flowInstance.count({ where: { ownerUnitId: id } });
    if (usage > 0 || flows > 0) {
      throw new NotFoundException('No se puede eliminar: unidad en uso por usuarios o flujos');
    }
    await this.prisma.unit.delete({ where: { id } });
    return { deleted: true };
  }

  private sanitize(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarColor: user.avatarColor,
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
}
