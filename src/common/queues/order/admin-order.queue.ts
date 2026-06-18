import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../modules/redis.module';
import { ADMIN_ORDER_QUEUE } from '../queue.constants';

export type AdminOrderJobType =
  | 'order-booked'
  | 'order-reviewed'
  | 'order-approved'
  | 'balance-reminder';

export interface AdminOrderJob {
  type: AdminOrderJobType;
  orderId: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AdminOrderQueueService {
  constructor(
    @InjectQueue(ADMIN_ORDER_QUEUE) private readonly adminOrderQueue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async enqueueOrderBooked(orderId: string): Promise<string | undefined> {
    return this.enqueue('order-booked', orderId);
  }

  async enqueueOrderReviewed(
    orderId: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<string | undefined> {
    return this.enqueue('order-reviewed', orderId, actorId, metadata);
  }

  async enqueueOrderApproved(
    orderId: string,
    actorId?: string,
  ): Promise<string | undefined> {
    return this.enqueue('order-approved', orderId, actorId);
  }

  async enqueueBalanceReminder(
    orderId: string,
    actorId?: string,
  ): Promise<string | undefined> {
    return this.enqueue('balance-reminder', orderId, actorId);
  }

  private async enqueue(
    type: AdminOrderJobType,
    orderId: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<string | undefined> {
    const job = await this.adminOrderQueue.add(
      type,
      { type, orderId, actorId, metadata } as AdminOrderJob,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    await this.redis.set(
      `admin:order:${orderId}:lastJob`,
      JSON.stringify({ jobId: job.id, type, status: 'queued' }),
      'EX',
      60 * 60 * 24,
    );

    return job.id;
  }
}
