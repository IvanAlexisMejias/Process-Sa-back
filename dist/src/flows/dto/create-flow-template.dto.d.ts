import { RoleKey } from '@prisma/client';
declare class FlowStageInput {
    name: string;
    description: string;
    expectedDurationDays: number;
    exitCriteria: string;
    ownerRole: RoleKey;
}
export declare class CreateFlowTemplateDto {
    name: string;
    description: string;
    businessObjective: string;
    typicalDurationDays: number;
    ownerId: string;
    stages: FlowStageInput[];
}
export {};
