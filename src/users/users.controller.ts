import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  findAll(@Query('role') role?: string, @Query('unitId') unitId?: string) {
    return this.usersService.findAll(role, unitId);
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles('ADMIN')
  @Post('users')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles('ADMIN')
  @Patch('users/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch('profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const userId = (req.user as any)?.userId;
    return this.usersService.updateProfile(userId, dto);
  }

  @Roles('ADMIN')
  @Delete('users/:id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('roles')
  listRoles() {
    return this.usersService.listRoles();
  }

  @Get('units')
  listUnits() {
    return this.usersService.listUnits();
  }

  @Roles('ADMIN')
  @Post('units')
  createUnit(@Body() dto: CreateUnitDto) {
    return this.usersService.createUnit(dto);
  }
}
