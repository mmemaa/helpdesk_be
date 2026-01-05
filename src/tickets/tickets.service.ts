import { Injectable, NotFoundException } from '@nestjs/common';
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
  async create(createTicketDto: CreateTicketDto) {
    // Validate that referenced entities exist
    const queue = await this.prisma.ticketQueue.findUnique({
      where: { id: createTicketDto.queueId },
    });

    if (!queue) {
      throw new NotFoundException(`Queue with ID ${createTicketDto.queueId} not found`);
    }

    const status = await this.prisma.ticketStatus.findFirst({
      where: { name: createTicketDto.status },
    });

    if (!status) {
      throw new NotFoundException(`Status "${createTicketDto.status}" not found`);
    }

    const createdBy = await this.prisma.user.findUnique({
      where: { id: createTicketDto.createdById },
    });

    if (!createdBy) {
      throw new NotFoundException(
        `User with ID ${createTicketDto.createdById} not found`,
      );
    }

    const ticket = await this.prisma.ticket.create({
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

    // Calculate and add SLA deadline
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
   * Get all tickets
   */
  async findAll() {
    const tickets = await this.prisma.ticket.findMany({
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
    return await this.prisma.ticketStatus.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single ticket by ID
   */
  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
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

    // Calculate and add SLA deadline
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
   * Update a ticket
   */
  async update(id: number, updateTicketDto: UpdateTicketDto) {
    // Verify ticket exists
    await this.findOne(id);

    // If status is provided, convert status name to statusId
    let statusId: number | undefined;
    if (updateTicketDto.status) {
      const status = await this.prisma.ticketStatus.findFirst({
        where: { name: updateTicketDto.status },
      });
      if (!status) {
        throw new NotFoundException(`Status "${updateTicketDto.status}" not found`);
      }
      statusId = status.id;
    }

    const ticket = await this.prisma.ticket.update({
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
    const status = await this.prisma.ticketStatus.findFirst({
      where: { name: statusName },
    });

    if (!status) {
      throw new NotFoundException(`Status "${statusName}" not found`);
    }

    const ticket = await this.prisma.ticket.update({
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const ticket = await this.prisma.ticket.update({
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
    await this.prisma.sLAHistory.deleteMany({
      where: { ticketId: id },
    });

    // Delete related comments
    await this.prisma.ticketComment.deleteMany({
      where: { ticketId: id },
    });

    // Delete ticket
    return await this.prisma.ticket.delete({
      where: { id },
    });
  }

  /**
   * Get all tickets with SLA breaches
   */
  async getBreachedTickets() {
    return await this.prisma.ticket.findMany({
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
