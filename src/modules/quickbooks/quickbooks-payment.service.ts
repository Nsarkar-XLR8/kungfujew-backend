import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { QuickBooksAuthService } from './quickbooks-auth.service';

export interface QuickBooksChargeResult {
  success: boolean;
  transactionId?: string;
  amountCharged: number;
  error?: string;
}

@Injectable()
export class QuickBooksPaymentService {
  private readonly logger = new Logger(QuickBooksPaymentService.name);
  private readonly environment: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authService: QuickBooksAuthService,
  ) {
    this.environment =
      this.configService.get<string>('QB_ENVIRONMENT') || 'sandbox';
  }

  async charge(
    amount: number,
    currency: string,
    description: string,
    customerEmail?: string,
  ): Promise<QuickBooksChargeResult> {
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) {
      return { success: false, amountCharged: 0, error: 'QuickBooks not connected' };
    }

    const connection = await this.authService.getConnectionStatus();
    if (!connection.connected || !connection.realmId) {
      return { success: false, amountCharged: 0, error: 'No active QuickBooks connection' };
    }

    const baseUrl =
      this.environment === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';

    try {
      const chargePayload = {
        amount: amount.toFixed(2),
        currency: currency || 'USD',
        description,
        context: {
          customerEmail,
          tax: false,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post<{ id: string; amount: number; status: string }>(
          `${baseUrl}/v3/company/${connection.realmId}/payment`,
          chargePayload,
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
        `QuickBooks charge successful: ${response.data.id}, amount: ${amount}`,
      );

      return {
        success: true,
        transactionId: response.data.id,
        amountCharged: amount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`QuickBooks charge failed: ${message}`);
      return { success: false, amountCharged: 0, error: message };
    }
  }
}
