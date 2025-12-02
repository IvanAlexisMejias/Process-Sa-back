import { TaskPriority } from '@prisma/client';
declare class StageTaskInput {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueInDays?: number;
    ownerId?: string;
}
declare class StageTaskGroupInput {
    stageId: string;
    tasks: StageTaskInput[];
}
export declare class CreateFlowInstanceDto {
    templateId: string;
    name: string;
    ownerUnitId: string;
    kickoffDate: string;
    dueDate: string;
    stageTasks?: StageTaskGroupInput[];
}
export {};
