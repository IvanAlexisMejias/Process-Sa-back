import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: CreateUserDto): Promise<{
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
    findAll(roleKey?: string, unitId?: string): Promise<{
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
    update(id: string, data: UpdateUserDto): Promise<{
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
    updateProfile(userId: string, data: UpdateProfileDto): Promise<{
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
    private sanitize;
}
