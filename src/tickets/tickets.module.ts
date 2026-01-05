import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { SLAModule } from '../sla/sla.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SLAModule, NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService],
  exports: [TicketsService],
})
export class TicketsModule {}
