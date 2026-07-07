import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailQueueService } from '../../common/queues/email/email.queue';
import { QuickBooksInvoiceService } from '../quickbooks/quickbooks-invoice.service';
import { IOrder, OrderStatus } from '../customer/schemas/order.schema';

@Injectable()
export class DeliveryHandlerService {
  private readonly logger = new Logger(DeliveryHandlerService.name);

  constructor(
    @InjectModel('Order')
    private readonly orderModel: Model<IOrder>,
    private readonly quickBooksInvoice: QuickBooksInvoiceService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async handleDelivery(
    orderId: string,
    source: 'super_dispatch' | 'tailwind_tms',
  ): Promise<{ invoiceGenerated: boolean; emailQueued: boolean; error?: string }> {
    const result = { invoiceGenerated: false, emailQueued: false };

    try {
      const order = await this.orderModel.findOne({ orderId }).exec();
      if (!order) {
        const err = `Order ${orderId} not found for delivery handling`;
        this.logger.error(err);
        return { ...result, error: err };
      }

      if (order.status === OrderStatus.DELIVERED) {
        this.logger.warn(`Order ${orderId} already delivered, skipping`);
        return result;
      }

      order.status = OrderStatus.DELIVERED;
      order.integrationStatus = {
        ...(order.integrationStatus || {}),
        deliverySource: source,
        deliveryProcessedAt: new Date(),
      };

      await order.save();
      this.logger.log(`Order ${orderId} marked as delivered via ${source}`);

      if (order.balanceAmountRemaining > 0 && order.customerEmail) {
        try {
          const invoice = await this.quickBooksInvoice.generateInvoice(order);
          if (invoice && invoice.invoiceId) {
            order.integrationStatus = {
              ...(order.integrationStatus || {}),
              quickBooksInvoiceId: invoice.invoiceId,
            };
            await order.save();
            result.invoiceGenerated = true;
            this.logger.log(`QuickBooks invoice generated for order ${orderId}: ${invoice.invoiceId}`);
          }
        } catch (invoiceError) {
          this.logger.error(
            `Failed to generate QuickBooks invoice for order ${orderId}: ${invoiceError instanceof Error ? invoiceError.message : String(invoiceError)}`,
          );
        }
      }

      if (order.customerEmail) {
        try {
          await this.emailQueue.sendDeliveryConfirmation(
            order.customerEmail,
            order.customerName || 'Valued Customer',
            order.orderId,
            {
              pickupLocation: order.pickupLocation || '',
              deliveryLocation: order.deliveryLocation || '',
              vehicleYear: order.vehicleYear || 0,
              vehicleMake: order.vehicleMake || '',
              vehicleModel: order.vehicleModel || '',
              balanceDue: order.balanceAmountRemaining || 0,
              paidInFull: (order.balanceAmountRemaining || 0) <= 0,
            },
          );
          result.emailQueued = true;
          this.logger.log(`Delivery confirmation email queued for order ${orderId}`);
        } catch (emailError) {
          this.logger.error(
            `Failed to queue delivery confirmation email for order ${orderId}: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
          );
        }
      }

      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Delivery handler error for order ${orderId}: ${errMsg}`);
      return { ...result, error: errMsg };
    }
  }
}
