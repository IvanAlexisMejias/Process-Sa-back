import { TaskStatus } from '@prisma/client';
export declare class UpdateTaskStatusDto {
    status: TaskStatus;
    progress?: number;
}
