import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get all notifications for the authenticated user
   * GET /notifications
   */
  @Get()
  async getAllNotifications(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return await this.notificationService.getNotificationsByUserId(userId);
  }

  /**
   * Get unread notifications for the authenticated user
   * GET /notifications/new
   */
  @Get('new')
  async getNewNotifications(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return await this.notificationService.getUnreadNotifications(userId);
  }

  /**
   * Get notifications created after a specific date
   * GET /notifications/since/:date
   * Usage: /notifications/since/2024-01-05T10:00:00Z
   */
  @Get('since/:date')
  async getNotificationsSinceDate(
    @Param('date') dateString: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return await this.notificationService.getNotificationsSinceDate(userId, date);
  }

  /**
   * Mark a notification as read
   * PUT /notifications/:id/read
   */
  @Get(':id/read')
  async markAsRead(@Param('id') notificationId: string) {
    return await this.notificationService.markAsRead(parseInt(notificationId));
  }

  /**
   * Mark all notifications as read for the authenticated user
   * PUT /notifications/mark-all-read
   */
  @Get('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return await this.notificationService.markAllAsRead(userId);
  }
}
