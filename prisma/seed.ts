import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.ticket.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.sLAHistory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ticketStatus.deleteMany();
  await prisma.ticketQueue.deleteMany();

  // Create statuses
  const openStatus = await prisma.ticketStatus.create({
    data: { name: 'Open' },
  });

  const inProgressStatus = await prisma.ticketStatus.create({
    data: { name: 'In Progress' },
  });

  const closedStatus = await prisma.ticketStatus.create({
    data: { name: 'Closed' },
  });

  const waitingStatus = await prisma.ticketStatus.create({
    data: { name: 'Waiting' },
  });

  // Create queues
  const telephonyQueue = await prisma.ticketQueue.create({
    data: { name: 'Telefonija' },
  });

  const internetQueue = await prisma.ticketQueue.create({
    data: { name: 'Internet' },
  });

  const cloudQueue = await prisma.ticketQueue.create({
    data: { name: 'Oblak' },
  });

  const supportQueue = await prisma.ticketQueue.create({
    data: { name: 'Podrška' },
  });

  // Create users
  const agentUser = await prisma.user.create({
    data: {
      email: 'agent@example.com',
      password: 'hashedpassword123',
      role: 'agent',
      avatarPath: '/avatars/agent.png',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      password: 'hashedpassword456',
      role: 'user',
      avatarPath: '/avatars/customer.png',
    },
  });

  // Create sample tickets
  await prisma.ticket.create({
    data: {
      title: 'Problemi s internetskom vezom',
      description: 'Nema interneta već dva dana',
      priority: 'high',
      statusId: openStatus.id,
      queueId: internetQueue.id,
      createdById: customerUser.id,
      assignedToId: agentUser.id,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Telefon ne radi',
      description: 'Telefonske linije su prekinute',
      priority: 'medium',
      statusId: inProgressStatus.id,
      queueId: telephonyQueue.id,
      createdById: customerUser.id,
      assignedToId: agentUser.id,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
