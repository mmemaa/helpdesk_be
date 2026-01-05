import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class SLAService {
  private readonly HIGH_PRIORITY_SLA_MINUTES = 1;

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Calculate SLA deadline based on priority
   */
  calculateSLADeadline(createdAt: Date, priority: string): Date {
    const deadline = new Date(createdAt);
    if (priority === 'high') {
      deadline.setMinutes(deadline.getMinutes() + this.HIGH_PRIORITY_SLA_MINUTES);
    }
    return deadline;
  }

  /**
   * Check if a ticket has breached SLA
   */
  isSLABreached(createdAt: Date, priority: string, status: string): boolean {
    if (priority !== 'high' || status === 'Closed') {
      return false;
    }

    return true;
  }

  /**
   * Monitor all high-priority tickets for SLA breaches
   * This should be called by a scheduled task
   */
  async monitorSLABreaches(): Promise<void> {
    const openTickets = await this.prisma.ticket.findMany({
      where: {
        priority: 'high',
        status: {
          name: {
            not: 'Closed',
          },
        },
        slaBreached: false,
      },
      include: {
        status: true,
        assignedTo: true,
        createdBy: true,
      },
    });

    for (const ticket of openTickets) {
      const isBreached = this.isSLABreached(
        ticket.createdAt,
        ticket.priority,
        ticket.status.name,
      );

      if (isBreached && !ticket.slaBreached) {
        // Mark ticket as breached
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { slaBreached: true },
        });

        // Create SLA history record
        await this.prisma.sLAHistory.create({
          data: {
            ticketId: ticket.id,
            breachedAt: new Date(),
          },
        });

        // Send notification
        if (ticket.assignedTo?.email) {
          await this.notificationService.sendSLABreachNotification({
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            assignedToEmail: ticket.assignedTo.email,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            deadline: this.calculateSLADeadline(ticket.createdAt, ticket.priority),
          });
        }
      }

      // If already notified and still breached, no need to notify again
      if (isBreached && ticket.slaBreached && !ticket.slaNotified) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { slaNotified: true },
        });

        // Update SLA history with notification time
        const slaRecord = await this.prisma.sLAHistory.findFirst({
          where: { ticketId: ticket.id },
        });

        if (slaRecord) {
          await this.prisma.sLAHistory.update({
            where: { id: slaRecord.id },
            data: { notifiedAt: new Date() },
          });
        }
      }
    }
  }

  /**
   * Resolve SLA when ticket is closed
   */
  async resolveSLA(ticketId: number): Promise<void> {
    const slaHistory = await this.prisma.sLAHistory.findFirst({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
    });

    if (slaHistory) {
      await this.prisma.sLAHistory.update({
        where: { id: slaHistory.id },
        data: { resolvedAt: new Date() },
      });
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { slaBreached: false, slaNotified: false },
    });
  }

  /**
   * Get SLA status for a ticket
   */
  async getSLAStatus(
    ticketId: number,
  ): Promise<{
    isBreach: boolean;
    timeRemaining: number;
    deadline: Date | null;
    status: string;
  }> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { status: true },
    });

    if (!ticket || ticket.status.name === 'Closed') {
      return {
        isBreach: false,
        timeRemaining: 0,
        deadline: null,
        status: 'resolved',
      };
    }

    const deadline = this.calculateSLADeadline(ticket.createdAt, ticket.priority);
    const now = new Date();
    const timeRemaining = deadline.getTime() - now.getTime();

    return {
      isBreach: timeRemaining < 0,
      timeRemaining: Math.max(0, timeRemaining),
      deadline,
      status: timeRemaining < 0 ? 'breached' : 'active',
    };
  }
}
