import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(payload: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: any;
            fullName: any;
            email: any;
            avatarColor: any;
            workload: any;
            lastLogin: any;
            roleId: any;
            unitId: any;
            role: {
                id: any;
                key: any;
                name: any;
                permissions: any;
            };
            unit: any;
        };
    }>;
    login(payload: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: any;
            fullName: any;
            email: any;
            avatarColor: any;
            workload: any;
            lastLogin: any;
            roleId: any;
            unitId: any;
            role: {
                id: any;
                key: any;
                name: any;
                permissions: any;
            };
            unit: any;
        };
    }>;
}
