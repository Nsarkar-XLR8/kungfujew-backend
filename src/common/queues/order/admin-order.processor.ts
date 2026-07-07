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
import { SuperDispatchOrderService } from '../../../modules/super-dispatch/super-dispatch-order.service';
import { TailwindTmsService } from '../../../modules/tailwind-tms/tailwind-tms.service';
import { CarrierService } from '../../../modules/carrier/carrier.service';
import { EmailQueueService } from '../email/email.queue';

@Processor(ADMIN_ORDER_QUEUE)
export class AdminOrderProcessor extends WorkerHost {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly superDispatchOrderService: SuperDispatchOrderService,
    private readonly tailwindTmsService: TailwindTmsService,
    private readonly carrierService: CarrierService,
    private readonly emailQueue: EmailQueueService,
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
    const superDispatchResult = await this.superDispatchOrderService.postOrderToBoard(orderId);

    const tailwindTmsResult = await this.tailwindTmsService.createShipment(orderId);
    let tailwindDispatchResult: { success: boolean; error?: string } | undefined;
    if (tailwindTmsResult.success && tailwindTmsResult.shipmentId) {
      tailwindDispatchResult = await this.tailwindTmsService.dispatchToDriver(
        orderId,
        tailwindTmsResult.shipmentId,
      );
    }

    const order = await this.orderModel.findOne({ orderId }).lean().exec();
    let carrierBlastCount = 0;
    if (order) {
      carrierBlastCount = await this.carrierService.blastOrderToCarriers(orderId, {
        customerName: order.customerName || order.customerEmail || 'Valued Customer',
        pickupLocation: order.pickupLocation || '',
        deliveryLocation: order.deliveryLocation || '',
        vehicleYear: order.vehicleYear || 0,
        vehicleMake: order.vehicleMake || '',
        vehicleModel: order.vehicleModel || '',
        transportType: order.transportType || 'open',
        payout: order.grandTotalPrice || 0,
      });
    }

    await this.orderModel.updateOne(
      { orderId, status: OrderStatus.APPROVED },
      {
        $set: {
          integrationStatus: {
            superDispatch: {
              status: superDispatchResult.success ? 'posted' : 'failed',
              remoteOrderId: superDispatchResult.remoteOrderId,
              error: superDispatchResult.error,
            },
            tailwindTms: {
              status: tailwindTmsResult.success ? 'shipment_created' : 'failed',
              shipmentId: tailwindTmsResult.shipmentId,
              dispatchStatus: tailwindDispatchResult?.success ? 'dispatched' : undefined,
              error: tailwindTmsResult.error || tailwindDispatchResult?.error,
            },
            carrierEmailBlast: {
              status: carrierBlastCount > 0 ? 'sent' : 'no_contacts',
              recipientsCount: carrierBlastCount,
            },
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
    const order = await this.orderModel.findOne({ orderId }).exec();

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

    if (order?.customerEmail) {
      await this.emailQueue.sendBalanceReminder(
        order.customerEmail,
        order.customerName || 'Valued Customer',
        order.orderId,
        {
          balanceDue: order.balanceAmountRemaining || 0,
          vehicleYear: order.vehicleYear || 0,
          vehicleMake: order.vehicleMake || '',
          vehicleModel: order.vehicleModel || '',
          orderStatus: order.status || 'unknown',
          paymentLink: `${process.env.FRONTEND_URL || ''}/orders/${order.orderId}/pay`,
        },
      );
    }

    await this.redis.set(
      `admin:orders:balance-reminder:${orderId}`,
      JSON.stringify({ orderId, jobId, queuedAt: new Date().toISOString() }),
      'EX',
      60 * 60 * 24,
    );
  }
}
