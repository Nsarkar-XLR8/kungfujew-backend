import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { SuperDispatchAuthService } from './super-dispatch-auth.service';
import {
  PostOrderDto,
  VenueLocation,
  VehicleEntry,
  CustomerPaymentMatrix,
} from './dto/post-order.dto';
import { IOrder } from '../customer/schemas/order.schema';

@Injectable()
export class SuperDispatchOrderService {
  private readonly logger = new Logger(SuperDispatchOrderService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authService: SuperDispatchAuthService,
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
  ) {
    this.baseUrl =
      this.configService.get<string>('SUPER_DISPATCH_BASE_URL') ||
      'https://api.shipper.superdispatch.com';
  }

  async postOrderToBoard(orderId: string): Promise<{ success: boolean; remoteOrderId?: string; error?: string }> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }

    try {
      const payload = this.buildOrderPayload(order);
      const token = await this.authService.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.post<{ orderGuid?: string; id?: string }>(
          `${this.baseUrl}/v1/public/orders`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const remoteOrderId = response.data?.orderGuid || response.data?.id;

      await this.orderModel.updateOne(
        { orderId },
        {
          $set: {
            'integrationStatus.superDispatch': {
              status: 'posted',
              remoteOrderId,
              postedAt: new Date(),
            },
          },
        },
      );

      this.logger.log(`Order ${orderId} posted to Super Dispatch load board. Remote ID: ${remoteOrderId}`);
      return { success: true, remoteOrderId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to post order ${orderId} to Super Dispatch: ${message}`);

      await this.orderModel.updateOne(
        { orderId },
        {
          $set: {
            'integrationStatus.superDispatch': {
              status: 'failed',
              error: message,
              failedAt: new Date(),
            },
          },
        },
      );

      return { success: false, error: message };
    }
  }

  private buildOrderPayload(order: IOrder): PostOrderDto {
    const origin: VenueLocation = {
      city: order.pickupLocation.split(',')[0]?.trim() || order.pickupLocation,
      state: this.extractState(order.pickupLocation),
      zip: this.extractZip(order.pickupLocation),
      scheduledAt: order.pickupAvailableDate?.toISOString(),
      contactName: order.customerName,
      contactPhone: order.customerPhone,
      contactEmail: order.customerEmail,
    };

    const destination: VenueLocation = {
      city: order.deliveryLocation.split(',')[0]?.trim() || order.deliveryLocation,
      state: this.extractState(order.deliveryLocation),
      zip: this.extractZip(order.deliveryLocation),
      scheduledAt: order.deliveryAvailableDate?.toISOString(),
      contactName: order.customerName,
      contactPhone: order.customerPhone,
      contactEmail: order.customerEmail,
    };

    const vehicle: VehicleEntry = {
      year: order.vehicleYear,
      make: order.vehicleMake,
      model: order.vehicleModel,
      type: order.vehicleType,
      condition: order.condition,
      isOperable: order.condition === 'Running',
    };

    const customerPayment: CustomerPaymentMatrix = {
      depositAmount: order.depositAmountCalculated || 0,
      balanceAmount: order.balanceAmountRemaining || 0,
      totalAmount: order.grandTotalPrice || order.subTotal,
      paymentMethod: order.paymentMethod || 'QuickBooks',
    };

    return {
      externalOrderId: order.orderId,
      origin,
      destination,
      vehicles: [vehicle],
      customerPayment,
      transportType: order.transportType,
      timelineType: order.timelineType,
      specialInstructions: `In-car freight weight: ${order.inCarFreightWeight} lbs`,
      referenceNumber: order.orderId,
    };
  }

  private extractState(location: string): string {
    const match = location.match(/\b([A-Z]{2})\b/);
    return match ? match[1] : '';
  }

  private extractZip(location: string): string {
    const match = location.match(/\b(\d{5}(?:-\d{4})?)\b/);
    return match ? match[1] : '';
  }
}
