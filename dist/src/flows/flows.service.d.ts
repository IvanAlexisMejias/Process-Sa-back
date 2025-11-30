import { PrismaService } from '@/prisma/prisma.service';
import { CreateFlowTemplateDto } from './dto/create-flow-template.dto';
import { CreateFlowInstanceDto } from './dto/create-flow-instance.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto';
export declare class FlowsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createTemplate(dto: CreateFlowTemplateDto): Promise<{
        stages: {
            id: string;
            name: string;
            description: string;
            expectedDurationDays: number;
            exitCriteria: string;
            ownerRole: import(".prisma/client").$Enums.RoleKey;
            templateId: string;
        }[];
    } & {
        id: string;
        name: string;
        description: string;
        businessObjective: string;
        typicalDurationDays: number;
        lastUpdated: Date;
        ownerId: string;
    }>;
    listTemplates(): Promise<({
        owner: {
            id: string;
            fullName: string;
        };
        stages: {
            id: string;
            name: string;
            description: string;
            expectedDurationDays: number;
            exitCriteria: string;
            ownerRole: import(".prisma/client").$Enums.RoleKey;
            templateId: string;
        }[];
    } & {
        id: string;
        name: string;
        description: string;
        businessObjective: string;
        typicalDurationDays: number;
        lastUpdated: Date;
        ownerId: string;
    })[]>;
    createInstance(dto: CreateFlowInstanceDto): Promise<{
        id: any;
        name: any;
        health: any;
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
        progress: any;
        kickoffDate: any;
        dueDate: any;
        templateId: any;
        ownerUnitId: any;
        template: any;
        ownerUnit: any;
        stageStatuses: any;
    }>;
    dashboard(): Promise<{
        instances: {
            id: any;
            name: any;
            health: any;
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
