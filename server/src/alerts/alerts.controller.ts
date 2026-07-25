import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto } from './dto/create-alert.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('alerts')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an alert rule' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAlertDto) {
    return this.alertsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all alert rules' })
  @ApiResponse({ status: 200, description: 'Array of alert rules' })
  findAll(@CurrentUser('id') userId: string) {
    return this.alertsService.findAll(userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an alert rule (enable/disable/change threshold)',
  })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Updated alert' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alertsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert deleted' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.alertsService.remove(userId, id);
  }
}

@ApiTags('notifications')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications' })
  @ApiQuery({
    name: 'unread',
    required: false,
    type: 'boolean',
    description: 'Filter to unread only',
  })
  @ApiResponse({ status: 200, description: 'Array of notifications' })
  getAll(@CurrentUser('id') userId: string, @Query('unread') unread?: string) {
    return this.alertsService.getNotifications(userId, unread === 'true');
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  getCount(@CurrentUser('id') userId: string) {
    return this.alertsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.alertsService.markRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.alertsService.markAllRead(userId);
  }
}
