import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { Model } from 'mongoose';
import { REDIS_CLIENT } from '../../modules/redis.module';
import {
  IOrder,
  OrderStatus,
} from '../../../modules/customer/schemas/order.schema';
import { ADMIN_ORDER_QUEUE } from '../queue.constants';
import { AdminOrderJob } from './admin-order.queue';

@Processor(ADMIN_ORDER_QUEUE)
export class AdminOrderProcessor extends WorkerHost {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: Job<AdminOrderJob>): Promise<void> {
    const { orderId, type } = job.data;

    await this.redis.set(
      `admin:order-job:${job.id}`,
      JSON.stringify({ orderId, type, status: 'processing' }),
      'EX',
      60 * 60 * 24,
    );

    switch (type) {
      case 'order-booked':
        await this.markAdminQueueAlert(orderId, job.id);
        break;
      case 'order-reviewed':
        await this.markReviewedQueueState(orderId, job.id);
        break;
      case 'order-approved':
        await this.markApprovedAutomationQueued(orderId, job.id);
        break;
      case 'balance-reminder':
        await this.markBalanceReminderQueued(orderId, job.id);
        break;
    }

    await this.redis.set(
      `admin:order-job:${job.id}`,
      JSON.stringify({ orderId, type, status: 'completed' }),
      'EX',
      60 * 60 * 24,
    );
  }

  private async markAdminQueueAlert(
    orderId: string,
    jobId?: string,
  ): Promise<void> {
    await this.redis.set(
      `admin:orders:pending-review:${orderId}`,
      JSON.stringify({ orderId, jobId, queuedAt: new Date().toISOString() }),
      'EX',
      60 * 60 * 24 * 7,
    );
  }

  private async markReviewedQueueState(
    orderId: string,
    jobId?: string,
  ): Promise<void> {
    await this.redis.set(
      `admin:orders:reviewed:${orderId}`,
      JSON.stringify({ orderId, jobId, reviewedAt: new Date().toISOString() }),
      'EX',
      60 * 60 * 24 * 7,
    );
  }

  private async markApprovedAutomationQueued(
    orderId: string,
    jobId?: string,
  ): Promise<void> {
    await this.orderModel.updateOne(
      { orderId, status: OrderStatus.APPROVED },
      {
        $set: {
          integrationStatus: {
            superDispatch: 'queued',
            centralDispatch: 'queued',
            carrierEmailBlast: 'queued',
            queuedAt: new Date(),
            jobId,
          },
        },
      },
    );
  }

  private async markBalanceReminderQueued(
    orderId: string,
    jobId?: string,
  ): Promise<void> {
    await this.orderModel.updateOne(
      { orderId },
      {
        $set: {
          lastReminderSentAt: new Date(),
          isBalanceAlertActive: true,
        },
        $inc: { reminderCount: 1 },
      },
    );

    await this.redis.set(
      `admin:orders:balance-reminder:${orderId}`,
      JSON.stringify({ orderId, jobId, queuedAt: new Date().toISOString() }),
      'EX',
      60 * 60 * 24,
    );
  }
}
