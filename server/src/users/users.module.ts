import { Module } from '@nestjs/common';
import { UsersController, UsersPublicController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UsersPublicController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
