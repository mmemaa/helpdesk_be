import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Express } from 'express';
import { TicketsService } from './tickets.service';
import { SLAService } from '../sla/sla.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly slaService: SLAService,
  ) {}

  /**
   * Create a new ticket with optional file attachments
   * POST /tickets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads');
          // Create directory if it doesn't exist
          const fs = require('fs');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        // Accept all files
        cb(null, true);
      },
    }),
  )
  async create(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      // Extract form fields from request body
      const body = req.body;
      
      console.log('Received form data:', body);
      console.log('Received files:', files?.length ?? 0);
      
      // Create DTO from form fields
      const createTicketDto: CreateTicketDto = {
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: body.status,
        queueId: Number(body.queueId),
        createdById: Number(body.createdById),
        assignedToId: body.assignedToId ? Number(body.assignedToId) : undefined,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      };

      // Validate required fields
      if (!createTicketDto.title || !createTicketDto.description || !createTicketDto.status || !createTicketDto.queueId || !createTicketDto.createdById) {
        throw new BadRequestException('Missing required fields: title, description, status, queueId, createdById');
      }

      console.log('Creating ticket with DTO:', createTicketDto);
      
      return await this.ticketsService.create(createTicketDto, files);
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Get all tickets with optional filtering
   * GET /tickets?priority=high&status=Open
   */
  @Get()
  async findAll(
    // @Query('priority') priority?: string,
    // @Query('status') status?: string,
  ) {
    return await this.ticketsService.findAll();
  }

  /**
   * Get all available statuses
   * GET /tickets/statuses/list
   */
  @Get('statuses/list')
  async getStatuses() {
    return await this.ticketsService.getStatuses();
  }

  /**
   * Get count of tickets with SLA breaches
   * GET /tickets/sla/breached/count
   */
  @Get('sla/breached/count')
  async getBreachedTicketsCount() {
    const count = await this.ticketsService.getBreachedTicketsCount();
    return { count };
  }

  /**
   * Get high-priority tickets with SLA breaches
   * GET /tickets/sla/breached
   */
  @Get('sla/breached')
  async getBreachedTickets() {
    return await this.ticketsService.getBreachedTickets();
  }

  /**
   * Manually trigger SLA monitoring
   * POST /tickets/sla/monitor
   * (For testing/admin purposes)
   */
  @Post('sla/monitor')
  async monitorSLABreaches() {
    await this.slaService.monitorSLABreaches();
    return { message: 'SLA monitoring completed' };
  }

  /**
   * Get a specific ticket by ID
   * GET /tickets/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.ticketsService.findOne(+id);
  }

  /**
   * Get SLA status for a ticket
   * GET /tickets/:id/sla-status
   */
  @Get(':id/sla-status')
  async getSLAStatus(@Param('id') id: string) {
    return await this.slaService.getSLAStatus(+id);
  }

  /**
   * Update a ticket
   * PUT /tickets/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    try {
      console.log(`[UPDATE] Updating ticket ${id} with:`, updateTicketDto);
      const result = await this.ticketsService.update(+id, updateTicketDto);
      console.log(`[UPDATE] Successfully updated ticket ${id}`);
      return result;
    } catch (error) {
      console.error(`[UPDATE ERROR] Ticket ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Failed to update ticket');
    }
  }

  /**
   * Close a ticket and resolve SLA
   * PUT /tickets/:id/close
   */
  @Put(':id/close')
  async closeTicket(@Param('id') id: string) {
    const ticketId = +id;

    // Resolve SLA
    await this.slaService.resolveSLA(ticketId);

    // Update ticket status to Closed
    return await this.ticketsService.updateStatus(ticketId, 'Closed');
  }

  /**
   * Assign ticket to a user
   * PUT /tickets/:id/assign/:userId
   */
  @Put(':id/assign/:userId')
  async assignTicket(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return await this.ticketsService.assignTicket(+id, +userId);
  }

  /**
   * Delete a ticket
   * DELETE /tickets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.ticketsService.remove(+id);
    return { message: 'Ticket successfully deleted' };
  }
}
