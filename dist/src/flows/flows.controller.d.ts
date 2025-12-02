import { FlowsService } from './flows.service';
import { CreateFlowTemplateDto } from './dto/create-flow-template.dto';
import { CreateFlowInstanceDto } from './dto/create-flow-instance.dto';
import { UpdateStageStatusDto } from './dto/update-stage-status.dto';
import { UpdateFlowTemplateDto } from './dto/update-flow-template.dto';
export declare class FlowsController {
    private readonly flowsService;
    constructor(flowsService: FlowsService);
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
    deleteTemplate(id: string): Promise<{
        deleted: boolean;
    }>;
    createInstance(dto: CreateFlowInstanceDto): Promise<{
        id: any;
        name: any;
        health: any;
        state: import("./flow-progress.util").FlowState;
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
        state: import("./flow-progress.util").FlowState;
        progress: any;
        kickoffDate: any;
        dueDate: any;
        templateId: any;
        ownerUnitId: any;
        template: any;
        ownerUnit: any;
        stageStatuses: any;
    }[]>;
    deleteInstance(id: string): Promise<{
        deleted: boolean;
    }>;
    updateStage(instanceId: string, stageId: string, dto: UpdateStageStatusDto): Promise<{
        id: any;
        name: any;
        health: any;
        state: import("./flow-progress.util").FlowState;
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
            state: import("./flow-progress.util").FlowState;
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
}
