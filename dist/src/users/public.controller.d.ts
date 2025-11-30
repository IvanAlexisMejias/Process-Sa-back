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
            parent: {
                id: string;
                name: string;
            } | null;
            lead: {
                id: string;
                fullName: string;
            } | null;
        } & {
            id: string;
            name: string;
            parentId: string | null;
            leadId: string | null;
        })[];
    }>;
}
