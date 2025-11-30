"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const SALT_ROUNDS = 10;
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(payload) {
        const existing = await this.prisma.user.findUnique({
            where: { email: payload.email },
        });
        if (existing) {
            throw new common_1.ConflictException('El correo ya está registrado.');
        }
        const hashed = await bcrypt.hash(payload.password, SALT_ROUNDS);
        const user = await this.prisma.user.create({
            data: {
                fullName: payload.fullName,
                email: payload.email,
                password: hashed,
                roleId: payload.roleId,
                unitId: payload.unitId,
            },
            include: {
                role: { include: { permissions: true } },
                unit: true,
            },
        });
        return this.buildAuthResponse(user);
    }
    async login(payload) {
        const user = await this.prisma.user.findUnique({
            where: { email: payload.email },
            include: {
                role: { include: { permissions: true } },
                unit: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const valid = await bcrypt.compare(payload.password, user.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        return this.buildAuthResponse(user);
    }
    buildAuthResponse(user) {
        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            roleKey: user.role.key,
        });
        const sanitized = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatarColor: user.avatarColor,
            workload: user.workload,
            lastLogin: user.lastLogin,
            roleId: user.roleId,
            unitId: user.unitId,
            role: {
                id: user.role.id,
                key: user.role.key,
                name: user.role.name,
                permissions: user.role.permissions.map((perm) => perm.value),
            },
            unit: user.unit,
        };
        return { accessToken: token, user: sanitized };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map