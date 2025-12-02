import { UsersService } from './users.service';
export declare class PublicController {
    private readonly usersService;
    constructor(usersService: UsersService);
    options(): Promise<{
        roles: {
            id: string;
            key: import(".prisma/client").$Enums.RoleKey;
            name: string;
            description: string;
            permissions: string[];
        }[];
        units: ({
            lead: {
                id: string;
                fullName: string;
            } | null;
            parent: {
                name: string;
                id: string;
            } | null;
        } & {
            name: string;
            id: string;
            parentId: string | null;
            leadId: string | null;
        })[];
    }>;
}
