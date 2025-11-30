import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('public')
export class PublicController {
  constructor(private readonly usersService: UsersService) {}

  @Get('options')
  async options() {
    const [roles, units] = await Promise.all([
      this.usersService.listRoles(),
      this.usersService.listUnits(),
    ]);
    return { roles, units };
  }
}
