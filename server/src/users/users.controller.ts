import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update name or avatar' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Wrong current password' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get plan usage stats (websites, views, platforms)',
  })
  @ApiResponse({ status: 200, description: 'Usage stats' })
  getUsage(@CurrentUser('id') userId: string) {
    return this.usersService.getUsage(userId);
  }

  @Patch('digest')
  @ApiOperation({ summary: 'Toggle the weekly AI email digest' })
  @ApiResponse({ status: 200, description: '{ weeklyDigest: boolean }' })
  setWeeklyDigest(
    @CurrentUser('id') userId: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.usersService.setWeeklyDigest(userId, enabled);
  }

  @Delete()
  @ApiOperation({ summary: 'Soft-delete account (restorable for 30 days)' })
  @ApiResponse({ status: 200, description: 'Account scheduled for deletion' })
  deleteAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(userId, dto);
  }
}

// Restore account — no auth needed (token-based)
import { Controller as Ctrl } from '@nestjs/common';

@ApiTags('users')
@Ctrl('users')
export class UsersPublicController {
  constructor(private readonly usersService: UsersService) {}

  @Post('restore')
  @ApiOperation({ summary: 'Restore deleted account using token from email' })
  @ApiQuery({
    name: 'token',
    type: 'string',
    description: 'Restore token from email',
  })
  @ApiResponse({ status: 201, description: 'Account restored' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  restoreAccount(@Query('token') token: string) {
    return this.usersService.restoreAccount(token);
  }
}
