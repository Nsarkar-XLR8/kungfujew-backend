import { ApiPropertyOptional } from '@nestjs/swagger';

export class TailwindTmsWebhookPayload {
  @ApiPropertyOptional({ description: 'Tailwind TMS shipment ID' })
  shipmentId?: string;

  @ApiPropertyOptional({ description: 'Alternative shipment identifier' })
  id?: string;

  @ApiPropertyOptional({ description: 'Webhook event type (e.g. delivery_confirmed)' })
  event?: string;

  @ApiPropertyOptional({ description: 'Shipment status (e.g. Delivered)' })
  status?: string;

  [key: string]: unknown;
}
