import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado.');
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

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        role: { include: { permissions: true } },
        unit: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await bcrypt.compare(payload.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: any) {
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
}
