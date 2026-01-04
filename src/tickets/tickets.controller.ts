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
} from '@nestjs/common';
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
   * Create a new ticket
   * POST /tickets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTicketDto: CreateTicketDto) {
    return await this.ticketsService.create(createTicketDto);
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
    return await this.ticketsService.update(+id, updateTicketDto);
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.ticketsService.remove(+id);
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
}
