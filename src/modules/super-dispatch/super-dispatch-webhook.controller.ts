import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SuperDispatchWebhookService } from './super-dispatch-webhook.service';
import { SuperDispatchWebhookPayload } from './dto/webhook-payload.dto';

@ApiTags('super-dispatch')
@Controller('webhooks/super-dispatch')
export class SuperDispatchWebhookController {
  constructor(
    private readonly webhookService: SuperDispatchWebhookService,
  ) {}

  @ApiOperation({
    summary: 'Receive Super Dispatch webhook events',
    description:
      'Accepts BOL completed, delivery notification, and order status change webhooks from Super Dispatch.',
  })
  @ApiBody({ type: SuperDispatchWebhookPayload })
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: SuperDispatchWebhookPayload) {
    return this.webhookService.processWebhook(payload);
  }
}
