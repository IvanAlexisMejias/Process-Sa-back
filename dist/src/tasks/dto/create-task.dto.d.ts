import { TaskPriority } from '@prisma/client';
import { CreateSubTaskDto } from './create-subtask.dto';
export declare class CreateTaskDto {
    title: string;
    description: string;
    priority: TaskPriority;
    ownerId: string;
    assignerId: string;
    deadline: string;
    flowInstanceId?: string;
    tags?: string[];
    subTasks?: CreateSubTaskDto[];
}
