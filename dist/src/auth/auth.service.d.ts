import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
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
    private buildAuthResponse;
}
