import { TaskStatus } from '@prisma/client';
export declare class UpdateStageStatusDto {
    status: TaskStatus;
    progress?: number;
    ownerId?: string;
}
