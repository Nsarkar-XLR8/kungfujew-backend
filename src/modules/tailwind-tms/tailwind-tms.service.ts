import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { IOrder } from '../customer/schemas/order.schema';

@Injectable()
export class TailwindTmsService implements OnModuleInit {
  private readonly logger = new Logger(TailwindTmsService.name);
  private readonly baseUrl: string;
  private readonly vendorToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
  ) {
    this.baseUrl =
      this.configService.get<string>('TAILWIND_TMS_BASE_URL') ||
      'https://api-s.envasetms.com/api';
    this.vendorToken =
      this.configService.get<string>('TAILWIND_TMS_TOKEN') || '';
  }

  async onModuleInit(): Promise<void> {
    const isValid = await this.validateTenant();
    if (isValid) {
      this.logger.log('Tailwind TMS tenant validation successful');
    } else {
      this.logger.warn('Tailwind TMS tenant validation failed — check VENDOR_TOKEN');
    }
  }

  async validateTenant(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ isMultiTenant?: boolean }>(
          `${this.baseUrl}/Account/${this.vendorToken}/IsCompanyMultiTenant`,
        ),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `Tailwind TMS tenant validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  async createShipment(orderId: string): Promise<{ success: boolean; shipmentId?: string; error?: string }> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }

    try {
      const payload = {
        referenceNumber: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        origin: {
          location: order.pickupLocation,
          scheduledAt: order.pickupAvailableDate?.toISOString(),
        },
        destination: {
          location: order.deliveryLocation,
          scheduledAt: order.deliveryAvailableDate?.toISOString(),
        },
        vehicle: {
          year: order.vehicleYear,
          make: order.vehicleMake,
          model: order.vehicleModel,
          type: order.vehicleType,
          condition: order.condition,
        },
        transportType: order.transportType,
        timelineType: order.timelineType,
        notes: `In-car freight: ${order.inCarFreightWeight} lbs`,
      };

      const response = await firstValueFrom(
        this.httpService.post<{ id?: string; shipmentId?: string }>(
          `${this.baseUrl}/Shipment/${this.vendorToken}`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const shipmentId = response.data?.id || response.data?.shipmentId;

      await this.orderModel.updateOne(
        { orderId },
        {
          $set: {
            'integrationStatus.tailwindTms': {
              status: 'shipment_created',
              shipmentId,
              createdAt: new Date(),
            },
          },
        },
      );

      this.logger.log(`Tailwind TMS shipment created for order ${orderId}, shipment ID: ${shipmentId}`);
      return { success: true, shipmentId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create Tailwind TMS shipment for order ${orderId}: ${message}`);

      await this.orderModel.updateOne(
        { orderId },
        {
          $set: {
            'integrationStatus.tailwindTms': {
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

  async dispatchToDriver(
    orderId: string,
    shipmentId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        dispatchDate: new Date().toISOString(),
        source: 'KungFuJew API',
      };

      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/Shipment/${this.vendorToken}/${shipmentId}/DispatchToNew`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      await this.orderModel.updateOne(
        { orderId },
        {
          $set: {
            'integrationStatus.tailwindTms.dispatchStatus': 'dispatched',
            'integrationStatus.tailwindTms.dispatchedAt': new Date(),
          },
        },
      );

      this.logger.log(`Tailwind TMS dispatch completed for order ${orderId}, shipment ${shipmentId}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to dispatch Tailwind TMS shipment ${shipmentId}: ${message}`);
      return { success: false, error: message };
    }
  }
}
