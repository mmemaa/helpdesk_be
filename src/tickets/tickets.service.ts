import { Injectable, NotFoundException } from '@nestjs/common';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  private readonly HIGH_PRIORITY_SLA_MINUTES = 1;

  constructor(private prisma: PrismaService) {}

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
   * Create a new ticket
   */
  async create(createTicketDto: CreateTicketDto, files?: Express.Multer.File[]) {
    try {
      // Validate that referenced entities exist
      const queue = await (this.prisma as any).ticketQueue.findUnique({
        where: { id: createTicketDto.queueId },
      });

      if (!queue) {
        throw new NotFoundException(`Queue with ID ${createTicketDto.queueId} not found`);
      }

      const status = await (this.prisma as any).ticketStatus.findFirst({
        where: { name: createTicketDto.status },
      });

      if (!status) {
        throw new NotFoundException(`Status "${createTicketDto.status}" not found`);
      }

      const createdBy = await (this.prisma as any).user.findUnique({
        where: { id: createTicketDto.createdById },
      });

      if (!createdBy) {
        throw new NotFoundException(
          `User with ID ${createTicketDto.createdById} not found`,
        );
      }

      console.log('All validations passed, creating ticket...');

      // Create ticket without attachments first
      const ticket = await (this.prisma as any).ticket.create({
        data: {
          title: createTicketDto.title,
          description: createTicketDto.description,
          priority: createTicketDto.priority || 'medium',
          statusId: status.id,
          queueId: createTicketDto.queueId,
          createdById: createTicketDto.createdById,
          assignedToId: createTicketDto.assignedToId,
          dueAt: createTicketDto.dueAt ? new Date(createTicketDto.dueAt) : null,
        },
        include: {
          status: true,
          queue: true,
          createdBy: true,
          assignedTo: true,
        },
      });

      console.log('Ticket created:', ticket.id);

      // Add attachments if files were provided
      const attachments: any[] = [];
      if (files && files.length > 0) {
        console.log('Processing', files.length, 'files...');
        for (const file of files) {
          try {
            const attachment = await (this.prisma as any).ticketAttachment.create({
              data: {
                ticketId: ticket.id,
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                path: file.path,
              },
            });
            console.log('Attachment saved:', attachment.id);
            attachments.push(attachment);
          } catch (error) {
            console.error('Error saving attachment:', error);
            throw error;
          }
        }
      }

      // Calculate and add SLA deadline
      const slaDeadline = this.calculateSLADeadline(
        ticket.createdAt,
        ticket.priority,
      );

      return {
        ...ticket,
        attachments,
        slaDeadline,
      };
    } catch (error) {
      console.error('Error in create method:', error);
      throw error;
    }
  }

  /**
   * Get all tickets
   */
  async findAll() {
    const tickets = await (this.prisma as any).ticket.findMany({
      include: {
        status: true,
        queue: true,
        createdBy: true,
        assignedTo: true,
        slaHistory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add SLA deadline to each ticket
    return tickets.map(ticket => ({
      ...ticket,
      slaDeadline: this.calculateSLADeadline(
        ticket.createdAt,
        ticket.priority,
      ),
    }));
  }

  /**
   * Get all available statuses
   */
  async getStatuses() {
    return await (this.prisma as any).ticketStatus.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single ticket by ID
   */
  async findOne(id: number) {
    const ticket = await (this.prisma as any).ticket.findUnique({
      where: { id },
      include: {
        status: true,
        queue: true,
        createdBy: true,
        assignedTo: true,
        comments: {
          include: { createdBy: true },
        },
        slaHistory: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Fetch attachments separately
    const attachments = await (this.prisma as any).ticketAttachment.findMany({
      where: { ticketId: id },
    });

    // Calculate and add SLA deadline
    const slaDeadline = this.calculateSLADeadline(
      ticket.createdAt,
      ticket.priority,
    );

    return {
      ...ticket,
      attachments,
      slaDeadline,
    };
  }

  /**
   * Update a ticket
   */
  async update(id: number, updateTicketDto: UpdateTicketDto) {
    // Verify ticket exists
    await this.findOne(id);

    // If status is provided, convert status name to statusId
    let statusId: number | undefined;
    if (updateTicketDto.status) {
      const status = await (this.prisma as any).ticketStatus.findFirst({
        where: { name: updateTicketDto.status },
      });
      if (!status) {
        throw new NotFoundException(`Status "${updateTicketDto.status}" not found`);
      }
      statusId = status.id;
    }

    const ticket = await (this.prisma as any).ticket.update({
      where: { id },
      data: {
        ...(updateTicketDto.title && { title: updateTicketDto.title }),
        ...(updateTicketDto.description && {
          description: updateTicketDto.description,
        }),
        ...(updateTicketDto.priority && { priority: updateTicketDto.priority }),
        ...(statusId && { statusId }),
        ...(updateTicketDto.queueId && { queueId: updateTicketDto.queueId }),
        ...(updateTicketDto.assignedToId && {
          assignedToId: updateTicketDto.assignedToId,
        }),
        ...(updateTicketDto.dueAt && { dueAt: updateTicketDto.dueAt }),
      },
      include: {
        status: true,
        queue: true,
        createdBy: true,
        assignedTo: true,
      },
    });

    // Add SLA deadline
    const slaDeadline = this.calculateSLADeadline(
      ticket.createdAt,
      ticket.priority,
    );

    return {
      ...ticket,
      slaDeadline,
    };
  }

  /**
   * Update ticket status
   */
  async updateStatus(id: number, statusName: string) {
    const status = await (this.prisma as any).ticketStatus.findFirst({
      where: { name: statusName },
    });

    if (!status) {
      throw new NotFoundException(`Status "${statusName}" not found`);
    }

    const ticket = await (this.prisma as any).ticket.update({
      where: { id },
      data: { statusId: status.id },
      include: {
        status: true,
        queue: true,
        createdBy: true,
        assignedTo: true,
      },
    });

    // Add SLA deadline
    const slaDeadline = this.calculateSLADeadline(
      ticket.createdAt,
      ticket.priority,
    );

    return {
      ...ticket,
      slaDeadline,
    };
  }

  /**
   * Assign ticket to a user
   */
  async assignTicket(ticketId: number, userId: number) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const ticket = await (this.prisma as any).ticket.update({
      where: { id: ticketId },
      data: { assignedToId: userId },
      include: {
        status: true,
        queue: true,
        createdBy: true,
        assignedTo: true,
      },
    });

    // Add SLA deadline
    const slaDeadline = this.calculateSLADeadline(
      ticket.createdAt,
      ticket.priority,
    );

    return {
      ...ticket,
      slaDeadline,
    };
  }

  /**
   * Delete a ticket
   */
  async remove(id: number) {
    await this.findOne(id);

    // Delete related SLA history
    await (this.prisma as any).sLAHistory.deleteMany({
      where: { ticketId: id },
    });

    // Delete related comments
    await (this.prisma as any).ticketComment.deleteMany({
      where: { ticketId: id },
    });

    // Delete ticket
    return await (this.prisma as any).ticket.delete({
      where: { id },
    });
  }

  /**
   * Get all tickets with SLA breaches
   */
  async getBreachedTickets() {
    return await (this.prisma as any).ticket.findMany({
      where: {
        slaBreached: true,
        status: {
          name: { not: 'Closed' },
        },
      },
      include: {
        status: true,
        queue: true,
        createdBy: true,
        assignedTo: true,
        slaHistory: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
