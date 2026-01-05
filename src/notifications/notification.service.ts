import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SLABreachNotificationPayload {
  ticketId: number;
  ticketTitle: string;
  assignedToEmail: string;
  assignedToUserId: number;
  priority: string;
  createdAt: Date;
  deadline: Date;
}

interface CreateNotificationPayload {
  userId: number;
  ticketId?: number;
  title: string;
  message: string;
  type: 'sla_breach' | 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'comment_added';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create and save a notification to the database
   */
  async createNotification(payload: CreateNotificationPayload): Promise<any> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          ticketId: payload.ticketId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
            },
          },
        },
      });

      this.logger.log(
        `[NOTIFICATION CREATED] User: ${payload.userId}, Type: ${payload.type}`,
      );
      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${payload.userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotificationsByUserId(userId: number): Promise<any[]> {
    try {
      return await this.prisma.notification.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch notifications for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: number): Promise<any[]> {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch unread notifications for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get notifications created after a specific date
   */
  async getNotificationsSinceDate(userId: number, sinceDate: Date): Promise<any[]> {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId,
          createdAt: {
            gte: sinceDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch notifications since ${sinceDate} for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number): Promise<any> {
    try {
      return await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    } catch (error) {
      this.logger.error(`Failed to mark notification ${notificationId} as read`, error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<any> {
    try {
      return await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Send SLA breach notification (saves to database and simulates email)
   */
  async sendSLABreachNotification(
    payload: SLABreachNotificationPayload,
  ): Promise<void> {
    try {
      // Create database notification
      await this.createNotification({
        userId: payload.assignedToUserId,
        ticketId: payload.ticketId,
        title: `SLA Breach Alert - Ticket #${payload.ticketId}`,
        message: `Your ticket "${payload.ticketTitle}" has breached SLA. Priority: ${payload.priority}`,
        type: 'sla_breach',
      });

      // Simulate email notification
      const emailContent = this.generateEmailContent(payload);
      await this.simulateEmailSend(payload.assignedToEmail, emailContent);

      // Log notification
      this.logSLABreachNotification(payload);

      // In production, you would integrate with:
      // - SendGrid API
      // - AWS SES
      // - Nodemailer
      // - Custom notification service
    } catch (error) {
      this.logger.error(
        `Failed to send SLA breach notification for ticket ${payload.ticketId}`,
        error,
      );
    }
  }

  /**
   * Simulate sending email (in production, use real email service)
   */
  private async simulateEmailSend(
    email: string,
    content: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      // Simulate async operation
      setTimeout(() => {
        this.logger.log(`[EMAIL SENT] To: ${email}`);
        this.logger.log(`[EMAIL CONTENT]\n${content}`);
        resolve();
      }, 100);
    });
  }

  /**
   * Generate email content for SLA breach
   */
  private generateEmailContent(payload: SLABreachNotificationPayload): string {
    const hoursOverdue = Math.round(
      (new Date().getTime() - payload.deadline.getTime()) / (1000 * 60 * 60),
    );

    return `
===========================================
⚠️  SLA BREACH ALERT - HELPDESK TICKET
===========================================

TICKET ID: #${payload.ticketId}
TITLE: ${payload.ticketTitle}
PRIORITY: ${payload.priority.toUpperCase()}

DEADLINE: ${payload.deadline.toLocaleString()}
CREATED: ${payload.createdAt.toLocaleString()}
TIME OVERDUE: ${hoursOverdue} hours

-------------------------------------------
ACTION REQUIRED:
This high-priority ticket has exceeded the 
24-hour Service Level Agreement (SLA).

Please review and update the ticket status 
immediately to maintain service quality.
-------------------------------------------

Best regards,
Helpdesk System
`;
  }

  /**
   * Log SLA breach notification for audit trail
   */
  private logSLABreachNotification(payload: SLABreachNotificationPayload): void {
    this.logger.warn(
      `[SLA BREACH] Ticket #${payload.ticketId}: "${payload.ticketTitle}" ` +
        `assigned to ${payload.assignedToEmail} (Priority: ${payload.priority})`,
    );
  }

  /**
   * Send notification for pending SLA tickets
   */
  async sendWarningNotification(
    userId: number,
    email: string,
    ticketId: number,
    ticketTitle: string,
    hoursUntilBreach: number,
  ): Promise<void> {
    try {
      // Create database notification
      await this.createNotification({
        userId,
        ticketId,
        title: `SLA Warning - Ticket #${ticketId}`,
        message: `Ticket "${ticketTitle}" will breach SLA in ${hoursUntilBreach} hours`,
        type: 'sla_breach',
      });

      const content = `
===========================================
⚠️  SLA WARNING - HELPDESK TICKET
===========================================

TICKET ID: #${ticketId}
TITLE: ${ticketTitle}
WARNING: SLA will be breached in ${hoursUntilBreach} hours

Please prioritize this ticket to avoid 
SLA breach.

Best regards,
Helpdesk System
`;

      await this.simulateEmailSend(email, content);
      this.logger.log(
        `[SLA WARNING] Sent warning for ticket #${ticketId} to ${email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send SLA warning notification for ticket ${ticketId}`,
        error,
      );
    }
  }
}
