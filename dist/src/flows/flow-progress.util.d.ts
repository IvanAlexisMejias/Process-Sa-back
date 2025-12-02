import { TaskStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
export type FlowState = 'no_iniciado' | 'en_progreso' | 'terminada';
export declare const recalcAndPersistFlowProgress: (prisma: PrismaService, instanceId: string) => Promise<{
    flow: {
        stageStatuses: ({
            owner: {
                id: string;
                fullName: string;
            };
            stage: {
                name: string;
                id: string;
                description: string;
                expectedDurationDays: number;
                exitCriteria: string;
                ownerRole: import(".prisma/client").$Enums.RoleKey;
                templateId: string;
            };
        } & {
            id: string;
            ownerId: string;
            progress: number;
            status: import(".prisma/client").$Enums.TaskStatus;
            stageId: string;
            instanceId: string;
        })[];
        ownerUnit: {
            name: string;
            id: string;
        };
        template: {
            name: string;
            id: string;
        };
    } & {
        name: string;
        id: string;
        templateId: string;
        kickoffDate: Date;
        dueDate: Date;
        health: import(".prisma/client").$Enums.FlowHealth;
        progress: number;
        ownerUnitId: string;
    };
    state: FlowState;
}>;
export declare const deriveStateFromStages: (stageStatuses: {
    progress: number;
    status: TaskStatus;
}[]) => FlowState;
