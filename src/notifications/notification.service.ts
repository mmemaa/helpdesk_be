import { Injectable, Logger } from '@nestjs/common';

interface SLABreachNotificationPayload {
  ticketId: number;
  ticketTitle: string;
  assignedToEmail: string;
  priority: string;
  createdAt: Date;
  deadline: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * Send SLA breach notification (simulated email/notification)
   */
  async sendSLABreachNotification(
    payload: SLABreachNotificationPayload,
  ): Promise<void> {
    try {
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
    email: string,
    ticketId: number,
    hoursUntilBreach: number,
  ): Promise<void> {
    try {
      const content = `
===========================================
⚠️  SLA WARNING - HELPDESK TICKET
===========================================

TICKET ID: #${ticketId}
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
