import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('quickbooks')
@Controller('webhooks/quickbooks')
export class QuickBooksWebhookController {
  private readonly logger = new Logger(QuickBooksWebhookController.name);

  @ApiOperation({
    summary: 'Receive QuickBooks webhook events',
  })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'QuickBooks webhook event notification payload',
      example: {
        eventNotifications: [
          {
            realmId: '123456789',
            dataChangeEvent: {
              entities: [
                { name: 'Invoice', id: '123', operation: 'Update', lastUpdated: '2025-01-01T12:00:00Z' },
              ],
            },
          },
        ],
      },
    },
  })
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: Record<string, unknown>) {
    this.logger.log(`QuickBooks webhook received: ${JSON.stringify(payload).substring(0, 200)}`);
    return { received: true };
  }
}
