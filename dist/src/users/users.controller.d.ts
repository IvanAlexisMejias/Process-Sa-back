import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(role?: string, unitId?: string): Promise<{
        id: any;
        fullName: any;
        email: any;
        avatarColor: any;
        title: any;
        phone: any;
        about: any;
        workload: any;
        lastLogin: any;
        roleId: any;
        unitId: any;
        role: {
            id: any;
            key: any;
            name: any;
            permissions: any;
        };
        unit: any;
    }[]>;
    findOne(id: string): Promise<{
        id: any;
        fullName: any;
        email: any;
        avatarColor: any;
        title: any;
        phone: any;
        about: any;
        workload: any;
        lastLogin: any;
        roleId: any;
        unitId: any;
        role: {
            id: any;
            key: any;
            name: any;
            permissions: any;
        };
        unit: any;
    }>;
    create(dto: CreateUserDto): Promise<{
        id: any;
        fullName: any;
        email: any;
        avatarColor: any;
        title: any;
        phone: any;
        about: any;
        workload: any;
        lastLogin: any;
        roleId: any;
        unitId: any;
        role: {
            id: any;
            key: any;
            name: any;
            permissions: any;
        };
        unit: any;
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        id: any;
        fullName: any;
        email: any;
        avatarColor: any;
        title: any;
        phone: any;
        about: any;
        workload: any;
        lastLogin: any;
        roleId: any;
        unitId: any;
        role: {
            id: any;
            key: any;
            name: any;
            permissions: any;
        };
        unit: any;
    }>;
    updateProfile(req: Request, dto: UpdateProfileDto): Promise<{
        id: any;
        fullName: any;
        email: any;
        avatarColor: any;
        title: any;
        phone: any;
        about: any;
        workload: any;
        lastLogin: any;
        roleId: any;
        unitId: any;
        role: {
            id: any;
            key: any;
            name: any;
            permissions: any;
        };
        unit: any;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    listRoles(): Promise<{
        id: string;
        key: import(".prisma/client").$Enums.RoleKey;
        name: string;
        description: string;
        permissions: string[];
    }[]>;
    listUnits(): Promise<({
        lead: {
            id: string;
            fullName: string;
        } | null;
        parent: {
            name: string;
            id: string;
        } | null;
    } & {
        name: string;
        id: string;
        parentId: string | null;
        leadId: string | null;
    })[]>;
    createUnit(dto: CreateUnitDto): Promise<{
        name: string;
        id: string;
        parentId: string | null;
        leadId: string | null;
    }>;
    updateUnit(id: string, dto: UpdateUnitDto): Promise<{
        name: string;
        id: string;
        parentId: string | null;
        leadId: string | null;
    }>;
    removeUnit(id: string): Promise<{
        deleted: boolean;
    }>;
}
