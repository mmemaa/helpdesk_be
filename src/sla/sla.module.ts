import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SLAService } from './sla.service';
import { SLAScheduledTask } from './sla-scheduled.task';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [SLAService, SLAScheduledTask, PrismaService],
  exports: [SLAService],
})
export class SLAModule {}
