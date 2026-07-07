import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { QuickBooksAuthService } from './quickbooks-auth.service';
import { IOrder } from '../customer/schemas/order.schema';

@Injectable()
export class QuickBooksInvoiceService {
  private readonly logger = new Logger(QuickBooksInvoiceService.name);
  private readonly environment: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authService: QuickBooksAuthService,
  ) {
    this.environment =
      this.configService.get<string>('QB_ENVIRONMENT') || 'sandbox';
  }

  async generateInvoice(
    order: IOrder,
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'QuickBooks not connected' };
    }

    const connection = await this.authService.getConnectionStatus();
    if (!connection.connected || !connection.realmId) {
      return { success: false, error: 'No active QuickBooks connection' };
    }

    const baseUrl =
      this.environment === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';

    try {
      const invoicePayload = {
        DocNumber: order.orderId,
        TxnDate: new Date().toISOString().split('T')[0],
        Line: [
          {
            DetailType: 'SalesItemLineDetail',
            Amount: order.balanceAmountRemaining || order.subTotal,
            Description: `Vehicle transport: ${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel} (${order.pickupLocation} → ${order.deliveryLocation})`,
            SalesItemLineDetail: {
              ItemRef: { name: 'Transportation' },
              Qty: 1,
              UnitPrice: order.balanceAmountRemaining || order.subTotal,
            },
          },
        ],
        CustomerRef: {
          name: order.customerName,
        },
        BillEmail: {
          Address: order.customerEmail,
        },
        DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      };

      const response = await firstValueFrom(
        this.httpService.post<{ Id: string; DocNumber: string }>(
          `${baseUrl}/v3/company/${connection.realmId}/invoice`,
          invoicePayload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );

      this.logger.log(
        `QuickBooks invoice created: ${response.data.Id} for order ${order.orderId}`,
      );

      return { success: true, invoiceId: response.data.Id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`QuickBooks invoice generation failed: ${message}`);
      return { success: false, error: message };
    }
  }
}
