import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOrder, OrderStatus } from '../customer/schemas/order.schema';
import { DeliveryHandlerService } from '../delivery/delivery-handler.service';
import { TailwindTmsWebhookPayload } from './dto/webhook-payload.dto';

@ApiTags('tailwind-tms')
@Controller('webhooks/tailwind-tms')
export class TailwindTmsWebhookController {
  private readonly logger = new Logger(TailwindTmsWebhookController.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
    private readonly deliveryHandler: DeliveryHandlerService,
  ) {}

  @ApiOperation({
    summary: 'Receive Tailwind TMS delivery confirmation webhook',
  })
  @ApiBody({ type: TailwindTmsWebhookPayload })
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: TailwindTmsWebhookPayload) {
    const shipmentId = (payload.shipmentId || payload.id) as string | undefined;
    const event = payload.event as string | undefined;
    this.logger.log(`Tailwind TMS webhook received: event=${event}, shipmentId=${shipmentId}`);

    if (event === 'delivery_confirmed' || payload.status === 'Delivered') {
      const order = await this.orderModel
        .findOne({ 'integrationStatus.tailwindTms.shipmentId': shipmentId })
        .exec();

      if (order) {
        await this.orderModel.updateOne(
          { orderId: order.orderId },
          {
            $set: {
              isBalanceAlertActive: false,
              'integrationStatus.tailwindTms.deliveredAt': new Date(),
              'integrationStatus.tailwindTms.deliveryData': payload,
            },
          },
        );
        await this.deliveryHandler.handleDelivery(order.orderId, 'tailwind_tms');
        this.logger.log(`Delivery confirmed for order ${order.orderId} via Tailwind TMS webhook`);
      }
    }

    return { received: true };
  }
}
