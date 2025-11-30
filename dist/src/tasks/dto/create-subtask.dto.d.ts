import { TaskStatus } from '@prisma/client';
export declare class CreateSubTaskDto {
    title: string;
    status?: TaskStatus;
    deadline: string;
    assigneeId: string;
}
