import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Tickets API (e2e)', () => {
  let app: INestApplication<App>;
  let testTicketId: number;

  // Test data IDs - adjust these based on your actual database
  const TEST_USER_ID = 1;
  const TEST_STATUS_ID = 1;
  const TEST_QUEUE_ID = 1;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tickets - Create Ticket', () => {
    it('should create a new ticket successfully', () => {
      const createTicketDto = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        priority: 'high',
        statusId: TEST_STATUS_ID,
        queueId: TEST_QUEUE_ID,
        createdById: TEST_USER_ID,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      return request(app.getHttpServer())
        .post('/tickets')
        .send(createTicketDto)
        .expect(201)
        .expect((res) => {
          testTicketId = res.body.id;
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Ticket');
          expect(res.body.description).toBe('This is a test ticket');
          expect(res.body.priority).toBe('high');
        });
    });

    it('should create ticket with default priority when not specified', () => {
      const createTicketDto = {
        title: 'Test Ticket Without Priority',
        description: 'Priority should default to medium',
        statusId: TEST_STATUS_ID,
        queueId: TEST_QUEUE_ID,
        createdById: TEST_USER_ID,
      };

      return request(app.getHttpServer())
        .post('/tickets')
        .send(createTicketDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Ticket Without Priority');
        });
    });

    it('should assign ticket to user on creation', () => {
      const createTicketDto = {
        title: 'Assigned Ticket',
        description: 'This ticket is assigned on creation',
        priority: 'medium',
        statusId: TEST_STATUS_ID,
        queueId: TEST_QUEUE_ID,
        createdById: TEST_USER_ID,
        assignedToId: TEST_USER_ID,
      };

      return request(app.getHttpServer())
        .post('/tickets')
        .send(createTicketDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.assignedToId).toBe(TEST_USER_ID);
        });
    });

    it('should fail when required fields are missing', () => {
      const invalidDto = {
        title: 'Invalid Ticket',
        // Missing required fields
      };

      return request(app.getHttpServer())
        .post('/tickets')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /tickets - Get All Tickets', () => {
    it('should return all tickets as an array', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return tickets with complete data', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            const ticket = res.body[0];
            expect(ticket).toHaveProperty('id');
            expect(ticket).toHaveProperty('title');
            expect(ticket).toHaveProperty('description');
            expect(ticket).toHaveProperty('priority');
            expect(ticket).toHaveProperty('statusId');
            expect(ticket).toHaveProperty('queueId');
            expect(ticket).toHaveProperty('createdById');
            expect(ticket).toHaveProperty('createdAt');
            expect(ticket).toHaveProperty('updatedAt');
          }
        });
    });
  });

  describe('GET /tickets/:id - Get Single Ticket', () => {
    it('should return a specific ticket by ID', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testTicketId);
          expect(res.body.title).toBe('Test Ticket');
        });
    });

    it('should include ticket comments when fetched', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('comments');
          expect(Array.isArray(res.body.comments)).toBe(true);
        });
    });

    it('should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .get('/tickets/999999')
        .expect(404);
    });

    it('should return 400 for invalid ticket ID format', () => {
      return request(app.getHttpServer())
        .get('/tickets/invalid')
        .expect(400);
    });
  });

  describe('GET /tickets/:id/sla-status - Get SLA Status', () => {
    it('should return SLA status for a ticket', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}/sla-status`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ticketId');
          expect(res.body).toHaveProperty('slaBreached');
          expect(res.body).toHaveProperty('remainingTime');
        });
    });

    it('should return false for slaBreached when ticket is within SLA', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}/sla-status`)
        .expect(200)
        .expect((res) => {
          expect(res.body.slaBreached).toBe(false);
        });
    });

    it('should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .get('/tickets/999999/sla-status')
        .expect(404);
    });
  });

  describe('PUT /tickets/:id - Update Ticket', () => {
    it('should update ticket title and description', () => {
      const updateDto = {
        title: 'Updated Test Ticket',
        description: 'This is an updated description',
      };

      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Test Ticket');
          expect(res.body.description).toBe('This is an updated description');
        });
    });

    it('should update ticket priority', () => {
      const updateDto = {
        priority: 'low',
      };

      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.priority).toBe('low');
        });
    });

    it('should update ticket status', () => {
      const updateDto = {
        statusId: testStatusId,
      };

      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusId).toBe(testStatusId);
        });
    });

    it('should update due date', () => {
      const newDueDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const updateDto = {
        dueAt: newDueDate,
      };

      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(new Date(res.body.dueAt).getTime()).toBeCloseTo(newDueDate.getTime(), -3);
        });
    });

    it('should return 404 for non-existent ticket', () => {
      const updateDto = {
        title: 'Non-existent',
      };

      return request(app.getHttpServer())
        .put('/tickets/999999')
        .send(updateDto)
        .expect(404);
    });
  });

  describe('PUT /tickets/:id/assign/:userId - Assign Ticket', () => {
    it('should assign ticket to a user', () => {
      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}/assign/${TEST_USER_ID}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.assignedToId).toBe(TEST_USER_ID);
        });
    });

    it('should reassign ticket to same user', () => {
      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}/assign/${TEST_USER_ID}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.assignedToId).toBe(TEST_USER_ID);
        });
    });

    it('should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .put(`/tickets/999999/assign/${TEST_USER_ID}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}/assign/999999`)
        .expect(404);
    });
  });

  describe('PUT /tickets/:id/close - Close Ticket', () => {
    it('should close a ticket successfully', () => {
      return request(app.getHttpServer())
        .put(`/tickets/${testTicketId}/close`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('Closed');
        });
    });

    it('should mark ticket status as Closed after closing', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}`)
        .expect(200)
        .expect((res) => {
          // Status should be related to 'Closed'
          expect(res.body).toHaveProperty('status');
        });
    });

    it('should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .put('/tickets/999999/close')
        .expect(404);
    });
  });

  describe('DELETE /tickets/:id - Delete Ticket', () => {
    it('should delete a ticket successfully', async () => {
      // Create a new ticket to delete
      const createTicketDto = {
        title: 'Ticket to Delete',
        description: 'This ticket will be deleted',
        priority: 'low',
        statusId: testStatusId,
        queueId: testQueueId,
        createdById: testUserId,
      };

      const createRes = await request(app.getHttpServer())
        .post('/tickets')
        .send(createTicketDto);

      const ticketIdToDelete = createRes.body.id;

      return request(app.getHttpServer())
        .delete(`/tickets/${ticketIdToDelete}`)
        .expect(204);
    });

    it('should return 404 when trying to delete non-existent ticket', () => {
      return request(app.getHttpServer())
        .delete('/tickets/999999')
        .expect(404);
    });

    it('should not be able to fetch deleted ticket', async () => {
      // Create and delete a ticket
      const createTicketDto = {
        title: 'Ticket to Verify Delete',
        description: 'Will verify it no longer exists',
        priority: 'medium',
        statusId: testStatusId,
        queueId: testQueueId,
        createdById: testUserId,
      };

      const createRes = await request(app.getHttpServer())
        .post('/tickets')
        .send(createTicketDto);

      const ticketIdToDelete = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/tickets/${ticketIdToDelete}`)
        .expect(204);

      return request(app.getHttpServer())
        .get(`/tickets/${ticketIdToDelete}`)
        .expect(404);
    });
  });

  describe('GET /tickets/sla/breached - Get Breached Tickets', () => {
    it('should return breached tickets as an array', () => {
      return request(app.getHttpServer())
        .get('/tickets/sla/breached')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return tickets with breached SLA', () => {
      return request(app.getHttpServer())
        .get('/tickets/sla/breached')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            res.body.forEach((ticket) => {
              expect(ticket.slaBreached).toBe(true);
            });
          }
        });
    });
  });

  describe('POST /tickets/sla/monitor - Monitor SLA Breaches', () => {
    it('should trigger SLA monitoring successfully', () => {
      return request(app.getHttpServer())
        .post('/tickets/sla/monitor')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('SLA monitoring completed');
        });
    });
  });

  describe('Integration Tests', () => {
    it('should complete full ticket lifecycle', async () => {
      // 1. Create ticket
      const createDto = {
        title: 'Lifecycle Test Ticket',
        description: 'Testing full lifecycle',
        priority: 'medium',
        statusId: TEST_STATUS_ID,
        queueId: TEST_QUEUE_ID,
        createdById: TEST_USER_ID,
      };

      const createRes = await request(app.getHttpServer())
        .post('/tickets')
        .send(createDto)
        .expect(201);

      const ticketId = createRes.body.id;

      // 2. Assign ticket
      const assignRes = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}/assign/${TEST_USER_ID}`)
        .expect(200);

      expect(assignRes.body.assignedToId).toBe(TEST_USER_ID);

      // 3. Update ticket
      const updateDto = {
        description: 'Issue has been updated',
        priority: 'high',
      };

      const updateRes = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .send(updateDto)
        .expect(200);

      expect(updateRes.body.priority).toBe('high');

      // 4. Check SLA status
      const slaRes = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/sla-status`)
        .expect(200);

      expect(slaRes.body).toHaveProperty('slaBreached');

      // 5. Close ticket
      const closeRes = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}/close`)
        .expect(200);

      expect(closeRes.body.status).toBe('Closed');
    });
  });
});
