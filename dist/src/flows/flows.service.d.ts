import { PrismaService } from '@/prisma/prisma.service';
import { CreateFlowTemplateDto } from './dto/create-flow-template.dto';
import { CreateFlowInstanceDto } from './dto/create-flow-instance.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto';
import { UpdateFlowTemplateDto } from './dto/update-flow-template.dto';
import { FlowState } from './flow-progress.util';
export declare class FlowsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createTemplate(dto: CreateFlowTemplateDto): Promise<{
        stages: {
            name: string;
            id: string;
            description: string;
            expectedDurationDays: number;
            exitCriteria: string;
            ownerRole: import(".prisma/client").$Enums.RoleKey;
            templateId: string;
        }[];
    } & {
        name: string;
        id: string;
        description: string;
        businessObjective: string;
        typicalDurationDays: number;
        lastUpdated: Date;
        ownerId: string;
    }>;
    listTemplates(): Promise<({
        stages: {
            name: string;
            id: string;
            description: string;
            expectedDurationDays: number;
            exitCriteria: string;
            ownerRole: import(".prisma/client").$Enums.RoleKey;
            templateId: string;
        }[];
        owner: {
            id: string;
            fullName: string;
        };
    } & {
        name: string;
        id: string;
        description: string;
        businessObjective: string;
        typicalDurationDays: number;
        lastUpdated: Date;
        ownerId: string;
    })[]>;
    updateTemplate(id: string, dto: UpdateFlowTemplateDto): Promise<({
        stages: {
            name: string;
            id: string;
            description: string;
            expectedDurationDays: number;
            exitCriteria: string;
            ownerRole: import(".prisma/client").$Enums.RoleKey;
            templateId: string;
        }[];
        owner: {
            id: string;
            fullName: string;
        };
    } & {
        name: string;
        id: string;
        description: string;
        businessObjective: string;
        typicalDurationDays: number;
        lastUpdated: Date;
        ownerId: string;
    }) | null>;
    createInstance(dto: CreateFlowInstanceDto): Promise<{
        id: any;
        name: any;
        health: any;
        state: FlowState;
        progress: any;
        kickoffDate: any;
        dueDate: any;
        templateId: any;
        ownerUnitId: any;
        template: any;
        ownerUnit: any;
        stageStatuses: any;
    }>;
    listInstances(): Promise<{
        id: any;
        name: any;
        health: any;
        state: FlowState;
        progress: any;
        kickoffDate: any;
        dueDate: any;
        templateId: any;
        ownerUnitId: any;
        template: any;
        ownerUnit: any;
        stageStatuses: any;
    }[]>;
    updateStageStatus(instanceId: string, stageId: string, dto: UpdateStageStatusDto): Promise<{
        id: any;
        name: any;
        health: any;
        state: FlowState;
        progress: any;
        kickoffDate: any;
        dueDate: any;
        templateId: any;
        ownerUnitId: any;
        template: any;
        ownerUnit: any;
        stageStatuses: any;
    }>;
    deleteTemplate(id: string): Promise<{
        deleted: boolean;
    }>;
    deleteInstance(id: string): Promise<{
        deleted: boolean;
    }>;
    dashboard(): Promise<{
        instances: {
            id: any;
            name: any;
            health: any;
            state: FlowState;
            progress: any;
            kickoffDate: any;
            dueDate: any;
            templateId: any;
            ownerUnitId: any;
            template: any;
            ownerUnit: any;
            stageStatuses: any;
        }[];
        taskSummary: {};
    }>;
    private recalculateInstanceProgress;
    private instanceInclude;
    private mapInstance;
}
