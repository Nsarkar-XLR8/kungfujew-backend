import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminOrderQueueService } from '../../common/queues/order/admin-order.queue';

interface IOrder {
  orderId: string;
  status: string;
  balanceDue: number;
  isBalanceAlertActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @InjectModel('Order')
    private readonly orderModel: Model<IOrder>,
    private readonly adminOrderQueue: AdminOrderQueueService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processBalanceReminders(): Promise<void> {
    this.logger.log('Running daily balance reminder check...');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);

    const pendingReminders = await this.orderModel
      .find({
        status: { $in: ['approved', 'in_transit'] },
        balanceDue: { $gt: 0 },
        $or: [
          { isBalanceAlertActive: { $ne: true } },
          { lastReminderSentAt: { $lt: cutoff } },
        ],
      })
      .lean()
      .exec();

    this.logger.log(`Found ${pendingReminders.length} orders needing balance reminders`);

    for (const order of pendingReminders) {
      try {
        await this.adminOrderQueue.enqueueBalanceReminder(order.orderId);
      } catch (error) {
        this.logger.error(
          `Failed to queue balance reminder for order ${order.orderId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(`Queued ${pendingReminders.length} balance reminders`);
  }

  @Cron('*/15 * * * *')
  async cleanupStaleTimers(): Promise<void> {
    this.logger.log('Running stale timer cleanup...');

    const staleCutoff = new Date();
    staleCutoff.setHours(staleCutoff.getHours() - 48);

    const result = await this.orderModel.updateMany(
      {
        status: 'pending',
        createdAt: { $lt: staleCutoff },
        isStaleNotified: { $ne: true },
      },
      {
        $set: {
          status: 'expired',
          expiredAt: new Date(),
          isStaleNotified: true,
        },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} stale pending orders`);
    }
  }
}
