import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PublicController } from './public.controller';

@Module({
  controllers: [UsersController, PublicController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
