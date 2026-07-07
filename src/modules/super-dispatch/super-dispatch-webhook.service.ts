import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOrder, OrderStatus } from '../customer/schemas/order.schema';
import {
  SuperDispatchWebhookPayload,
  SuperDispatchWebhookEvent,
} from './dto/webhook-payload.dto';
import { DeliveryHandlerService } from '../delivery/delivery-handler.service';

@Injectable()
export class SuperDispatchWebhookService {
  private readonly logger = new Logger(SuperDispatchWebhookService.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
    private readonly deliveryHandler: DeliveryHandlerService,
  ) {}

  async processWebhook(payload: SuperDispatchWebhookPayload): Promise<{ received: boolean }> {
    this.logger.log(`Processing Super Dispatch webhook: ${payload.event} for order ${payload.orderId}`);

    const remoteOrderId = payload.orderId;
    const externalOrderId = payload.externalOrderId;

    let order: IOrder | null = null;

    if (externalOrderId) {
      order = await this.orderModel.findOne({ orderId: externalOrderId }).exec();
    }

    if (!order && remoteOrderId) {
      order = await this.orderModel
        .findOne({ 'integrationStatus.superDispatch.remoteOrderId': remoteOrderId })
        .exec();
    }

    if (!order) {
      this.logger.warn(`No matching order found for webhook: ${payload.event} (remote: ${remoteOrderId}, external: ${externalOrderId})`);
      return { received: true };
    }

    switch (payload.event) {
      case SuperDispatchWebhookEvent.BOL_COMPLETED:
        await this.handleBOLCompleted(order, payload);
        break;

      case SuperDispatchWebhookEvent.DELIVERY_NOTIFICATION:
        await this.handleDeliveryNotification(order, payload);
        break;

      case SuperDispatchWebhookEvent.ORDER_STATUS_CHANGED:
        await this.handleOrderStatusChanged(order, payload);
        break;

      default:
        this.logger.warn(`Unhandled webhook event type: ${payload.event}`);
    }

    return { received: true };
  }

  private async handleBOLCompleted(order: IOrder, payload: SuperDispatchWebhookPayload): Promise<void> {
    await this.orderModel.updateOne(
      { orderId: order.orderId },
      {
        $set: {
          'integrationStatus.superDispatch.bolCompletedAt': new Date(),
          'integrationStatus.superDispatch.bolData': payload.data,
        },
      },
    );

    this.logger.log(`BOL completed for order ${order.orderId}`);
  }

  private async handleDeliveryNotification(order: IOrder, payload: SuperDispatchWebhookPayload): Promise<void> {
    await this.orderModel.updateOne(
      { orderId: order.orderId },
      {
        $set: {
          isBalanceAlertActive: false,
          'integrationStatus.superDispatch.deliveredAt': new Date(),
          'integrationStatus.superDispatch.deliveryData': payload.data,
        },
      },
    );

    await this.deliveryHandler.handleDelivery(order.orderId, 'super_dispatch');
    this.logger.log(`Delivery confirmed for order ${order.orderId} via Super Dispatch webhook`);
  }

  private async handleOrderStatusChanged(order: IOrder, payload: SuperDispatchWebhookPayload): Promise<void> {
    const newStatus = payload.data?.status as string | undefined;
    if (!newStatus) return;

    const statusMap: Record<string, OrderStatus> = {
      Picked_Up: OrderStatus.DISPATCHED,
      Delivered: OrderStatus.DELIVERED,
      In_Transit: OrderStatus.DISPATCHED,
    };

    const mappedStatus = statusMap[newStatus];
    if (mappedStatus) {
      await this.orderModel.updateOne(
        { orderId: order.orderId },
        { $set: { status: mappedStatus } },
      );
    }
  }
}
