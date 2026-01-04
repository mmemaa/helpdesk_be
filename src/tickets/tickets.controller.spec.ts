import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { SLAService } from '../sla/sla.service';

describe('TicketsController Unit Tests', () => {
  let controller: TicketsController;
  let ticketsService: TicketsService;
  let slaService: SLAService;

  const mockTicket = {
    id: 1,
    title: 'Test Ticket',
    description: 'Test Description',
    priority: 'high',
    statusId: 1,
    queueId: 1,
    createdById: 1,
    assignedToId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    dueAt: new Date(),
    slaBreached: false,
    slaNotified: false,
  };

  const mockSLAStatus = {
    ticketId: 1,
    slaBreached: false,
    remainingTime: 86400,
    dueAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockTicket),
            findAll: jest.fn().mockResolvedValue([mockTicket]),
            findOne: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn().mockResolvedValue(mockTicket),
            updateStatus: jest.fn().mockResolvedValue(mockTicket),
            assignTicket: jest.fn().mockResolvedValue(mockTicket),
            remove: jest.fn().mockResolvedValue(undefined),
            getBreachedTickets: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: SLAService,
          useValue: {
            getSLAStatus: jest.fn().mockResolvedValue(mockSLAStatus),
            resolveSLA: jest.fn().mockResolvedValue(undefined),
            monitorSLABreaches: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    ticketsService = module.get<TicketsService>(TicketsService);
    slaService = module.get<SLAService>(SLAService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /tickets - Create Ticket', () => {
    it('should create a ticket successfully', async () => {
      const createTicketDto = {
        title: 'New Ticket',
        description: 'New Description',
        priority: 'high',
        statusId: 1,
        queueId: 1,
        createdById: 1,
      };

      const result = await controller.create(createTicketDto);

      expect(result).toEqual(mockTicket);
      expect(ticketsService.create).toHaveBeenCalledWith(createTicketDto);
    });

    it('should call ticketsService.create', async () => {
      const createTicketDto = {
        title: 'Test',
        description: 'Test',
        statusId: 1,
        queueId: 1,
        createdById: 1,
      };

      await controller.create(createTicketDto);

      expect(ticketsService.create).toHaveBeenCalled();
    });
  });

  describe('GET /tickets - Get All Tickets', () => {
    it('should return array of tickets', async () => {
      const result = await controller.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual(mockTicket);
      expect(ticketsService.findAll).toHaveBeenCalled();
    });

    it('should return empty array if no tickets exist', async () => {
      jest.spyOn(ticketsService, 'findAll').mockResolvedValueOnce([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('GET /tickets/:id - Get Single Ticket', () => {
    it('should return a single ticket by id', async () => {
      const result = await controller.findOne('1');

      expect(result).toEqual(mockTicket);
      expect(ticketsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should pass correct id to service', async () => {
      await controller.findOne('123');

      expect(ticketsService.findOne).toHaveBeenCalledWith(123);
    });
  });

  describe('GET /tickets/:id/sla-status - Get SLA Status', () => {
    it('should return SLA status', async () => {
      const result = await controller.getSLAStatus('1');

      expect(result).toEqual(mockSLAStatus);
      expect(slaService.getSLAStatus).toHaveBeenCalledWith(1);
    });

    it('should handle correct ticket id', async () => {
      await controller.getSLAStatus('42');

      expect(slaService.getSLAStatus).toHaveBeenCalledWith(42);
    });
  });

  describe('PUT /tickets/:id - Update Ticket', () => {
    it('should update ticket successfully', async () => {
      const updateTicketDto = {
        title: 'Updated Title',
        priority: 'low',
      };

      const result = await controller.update('1', updateTicketDto);

      expect(result).toEqual(mockTicket);
      expect(ticketsService.update).toHaveBeenCalledWith(1, updateTicketDto);
    });

    it('should pass correct parameters to service', async () => {
      const updateDto = {
        title: 'New Title',
      };

      await controller.update('99', updateDto);

      expect(ticketsService.update).toHaveBeenCalledWith(99, updateDto);
    });
  });

  describe('PUT /tickets/:id/close - Close Ticket', () => {
    it('should close ticket successfully', async () => {
      const result = await controller.closeTicket('1');

      expect(result).toEqual(mockTicket);
      expect(slaService.resolveSLA).toHaveBeenCalledWith(1);
      expect(ticketsService.updateStatus).toHaveBeenCalledWith(1, 'Closed');
    });

    it('should call both resolveSLA and updateStatus', async () => {
      await controller.closeTicket('5');

      expect(slaService.resolveSLA).toHaveBeenCalledWith(5);
      expect(ticketsService.updateStatus).toHaveBeenCalledWith(5, 'Closed');
    });
  });

  describe('PUT /tickets/:id/assign/:userId - Assign Ticket', () => {
    it('should assign ticket to user', async () => {
      const result = await controller.assignTicket('1', '2');

      expect(result).toEqual(mockTicket);
      expect(ticketsService.assignTicket).toHaveBeenCalledWith(1, 2);
    });

    it('should convert string ids to numbers', async () => {
      await controller.assignTicket('10', '20');

      expect(ticketsService.assignTicket).toHaveBeenCalledWith(10, 20);
    });
  });

  describe('DELETE /tickets/:id - Delete Ticket', () => {
    it('should delete ticket successfully', async () => {
      const result = await controller.remove('1');

      expect(result).toBeUndefined();
      expect(ticketsService.remove).toHaveBeenCalledWith(1);
    });

    it('should pass correct id to service', async () => {
      await controller.remove('77');

      expect(ticketsService.remove).toHaveBeenCalledWith(77);
    });
  });

  describe('GET /tickets/sla/breached - Get Breached Tickets', () => {
    it('should return breached tickets', async () => {
      const breachedTickets = [
        { ...mockTicket, slaBreached: true },
      ];

      jest.spyOn(ticketsService, 'getBreachedTickets').mockResolvedValueOnce(breachedTickets);

      const result = await controller.getBreachedTickets();

      expect(result).toEqual(breachedTickets);
      expect(ticketsService.getBreachedTickets).toHaveBeenCalled();
    });

    it('should return empty array if no breached tickets', async () => {
      jest.spyOn(ticketsService, 'getBreachedTickets').mockResolvedValueOnce([]);

      const result = await controller.getBreachedTickets();

      expect(result).toEqual([]);
    });
  });

  describe('POST /tickets/sla/monitor - Monitor SLA Breaches', () => {
    it('should trigger SLA monitoring', async () => {
      const result = await controller.monitorSLABreaches();

      expect(result).toEqual({ message: 'SLA monitoring completed' });
      expect(slaService.monitorSLABreaches).toHaveBeenCalled();
    });

    it('should return success message', async () => {
      const result = await controller.monitorSLABreaches();

      expect(result.message).toBe('SLA monitoring completed');
    });
  });

  describe('Integration Scenarios', () => {
    it('should create, assign, and close a ticket in sequence', async () => {
      const createDto = {
        title: 'Complete Workflow',
        description: 'Testing complete workflow',
        statusId: 1,
        queueId: 1,
        createdById: 1,
      };

      // Create
      const created = await controller.create(createDto);
      expect(created.id).toBe(1);

      // Assign
      const assigned = await controller.assignTicket('1', '1');
      expect(assigned.assignedToId).toBe(1);

      // Close
      const closed = await controller.closeTicket('1');
      expect(closed).toEqual(mockTicket);

      // Verify all methods were called
      expect(ticketsService.create).toHaveBeenCalled();
      expect(ticketsService.assignTicket).toHaveBeenCalled();
      expect(ticketsService.updateStatus).toHaveBeenCalled();
    });

    it('should handle update and status check', async () => {
      const updateDto = {
        priority: 'low',
        description: 'Updated description',
      };

      // Update
      const updated = await controller.update('1', updateDto);
      expect(updated).toEqual(mockTicket);

      // Check SLA status
      const slaStatus = await controller.getSLAStatus('1');
      expect(slaStatus).toEqual(mockSLAStatus);

      // Verify calls
      expect(ticketsService.update).toHaveBeenCalledWith(1, updateDto);
      expect(slaService.getSLAStatus).toHaveBeenCalledWith(1);
    });
  });
});
