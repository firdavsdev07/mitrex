import { Controller, Get, Patch, Delete, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch()
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get('usage')
  getUsage(@CurrentUser('id') userId: string) {
    return this.usersService.getUsage(userId);
  }

  @Delete()
  deleteAccount(@CurrentUser('id') userId: string, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(userId, dto);
  }
}

// Restore account — auth kerak emas (token orqali)
import { Controller as Ctrl } from '@nestjs/common';

@Ctrl('users')
export class UsersPublicController {
  constructor(private readonly usersService: UsersService) {}

  @Post('restore')
  restoreAccount(@Query('token') token: string) {
    return this.usersService.restoreAccount(token);
  }
}
