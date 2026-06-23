import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { QueueService } from '../queue/queue.service';
import { TogglePlatformDto } from './dto/toggle-platform.dto';
import { CreatePlanDto } from '../plans/dto/create-plan.dto';
import { Platform } from '@metrix/prisma-client';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @Optional() private readonly queue: QueueService,
  ) {}

  // ─── Stats ──────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide stats (total users, connections, revenue)' })
  @ApiResponse({ status: 200, description: 'Admin overview stats' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get BullMQ queue stats' })
  @ApiResponse({ status: 200, description: 'Queue job counts by status' })
  getQueueStats() {
    if (!this.queue) return { available: false };
    return this.queue.getStats();
  }

  // ─── Users ──────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiQuery({ name: 'deleted', required: false, type: 'boolean', description: 'Show only soft-deleted accounts' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
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
  @ApiOperation({ summary: 'Get full user detail with connections and subscription' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User detail' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/ban')
  @ApiOperation({ summary: 'Ban or unban a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { properties: { banned: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'Ban status updated' })
  banUser(@Param('id') id: string, @Body('banned') banned: boolean) {
    return this.adminService.banUser(id, banned);
  }

  @Patch('users/:id/plan')
  @ApiOperation({ summary: 'Override a user plan (e.g. grant Pro for free)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { properties: { plan: { type: 'string', example: 'pro' } } } })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  changeUserPlan(@Param('id') id: string, @Body('plan') plan: string) {
    return this.adminService.changeUserPlan(id, plan);
  }

  // ─── Platforms ──────────────────────────────────────────────────────────

  @Get('platforms')
  @ApiOperation({ summary: 'List all platform configs with enabled/comingSoon status' })
  @ApiResponse({ status: 200, description: 'Array of platform configs' })
  getPlatforms() {
    return this.adminService.getPlatforms();
  }

  @Patch('platforms/:slug')
  @ApiOperation({ summary: 'Enable/disable a platform or toggle comingSoon flag' })
  @ApiParam({ name: 'slug', enum: Platform, description: 'Platform slug' })
  @ApiResponse({ status: 200, description: 'Platform config updated' })
  togglePlatform(@Param('slug') slug: Platform, @Body() dto: TogglePlatformDto) {
    return this.adminService.togglePlatform(slug, dto);
  }

  // ─── Plans ──────────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'List all plans including inactive ones' })
  @ApiResponse({ status: 200, description: 'All plans' })
  getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update an existing plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  updatePlan(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(id);
  }
}
