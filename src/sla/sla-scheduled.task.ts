import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SLAService } from './sla.service';

@Injectable()
export class SLAScheduledTask {
  private readonly logger = new Logger(SLAScheduledTask.name);

  constructor(private readonly slaService: SLAService) {}

  /**
   * Run SLA monitoring every 30 seconds
   * This checks all high-priority tickets and notifies if SLA is breached
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleSLAMonitoring(): Promise<void> {
    try {
      this.logger.debug('Starting SLA monitoring check...');
      await this.slaService.monitorSLABreaches();
      this.logger.debug('SLA monitoring check completed');
    } catch (error) {
      this.logger.error('Error during SLA monitoring:', error);
    }
  }

  /**
   * Run SLA monitoring every hour for high-priority tickets
   * Can be used for additional checks or cleanup
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCleanup(): Promise<void> {
    try {
      this.logger.debug('Running hourly SLA cleanup...');
      // Additional cleanup tasks can be added here
      this.logger.debug('Hourly SLA cleanup completed');
    } catch (error) {
      this.logger.error('Error during hourly SLA cleanup:', error);
    }
  }
}
