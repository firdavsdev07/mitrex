import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { TogglePlatformDto } from './dto/toggle-platform.dto';
import { CreatePlanDto } from '../plans/dto/create-plan.dto';
import { Platform } from '@metrix/prisma-client';

@UseGuards(JwtGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats ──────────────────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Users ──────────────────────────────────────────────────────────────
  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('deleted') deleted?: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      deleted: deleted === 'true',
    });
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string, @Body('banned') banned: boolean) {
    return this.adminService.banUser(id, banned);
  }

  @Patch('users/:id/plan')
  changeUserPlan(@Param('id') id: string, @Body('plan') plan: string) {
    return this.adminService.changeUserPlan(id, plan);
  }

  // ─── Platforms ──────────────────────────────────────────────────────────
  @Get('platforms')
  getPlatforms() {
    return this.adminService.getPlatforms();
  }

  @Patch('platforms/:slug')
  togglePlatform(@Param('slug') slug: Platform, @Body() dto: TogglePlatformDto) {
    return this.adminService.togglePlatform(slug, dto);
  }

  // ─── Plans ──────────────────────────────────────────────────────────────
  @Get('plans')
  getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(id);
  }
}
