import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SuperDispatchWebhookEvent {
  BOL_COMPLETED = 'bol.completed',
  DELIVERY_NOTIFICATION = 'delivery.notification',
  ORDER_STATUS_CHANGED = 'order.status.changed',
  DAMAGE_REPORTED = 'damage.reported',
}

export class SuperDispatchWebhookPayload {
  @ApiProperty({ enum: SuperDispatchWebhookEvent, description: 'Webhook event type' })
  event: SuperDispatchWebhookEvent;

  @ApiProperty({ description: 'Remote order ID from Super Dispatch' })
  orderId: string;

  @ApiPropertyOptional({ description: 'External order ID (KungFuJew order ID if provided)' })
  externalOrderId?: string;

  @ApiProperty({ description: 'Event timestamp in ISO 8601 format' })
  timestamp: string;

  @ApiProperty({ description: 'Event-specific payload data' })
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Webhook signature for verification' })
  signature?: string;
}

export class BOLCompletedData {
  @ApiPropertyOptional({ description: 'URL to the signed BOL document' })
  bolUrl?: string;

  @ApiPropertyOptional({ description: 'Timestamp when BOL was signed' })
  signedAt?: string;

  @ApiPropertyOptional({ description: 'Name of the person who signed the BOL' })
  signedByName?: string;

  @ApiPropertyOptional({ description: 'Number of vehicles on the order' })
  vehicleCount?: number;

  @ApiPropertyOptional({
    description: 'List of damages reported during inspection',
    type: 'array',
    example: [{ description: 'Scratch on rear bumper', photos: ['https://example.com/photo1.jpg'] }],
  })
  damages?: Array<{ description: string; photos?: string[] }>;
}

export class DeliveryNotificationData {
  @ApiProperty({ description: 'Timestamp when delivery occurred' })
  deliveredAt: string;

  @ApiPropertyOptional({ description: 'Name of the person who received delivery' })
  deliveredTo?: string;

  @ApiPropertyOptional({ description: 'URL to the proof of delivery document' })
  podUrl?: string;

  @ApiPropertyOptional({ description: 'URL to the delivery signature image' })
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Additional delivery notes' })
  notes?: string;
}
