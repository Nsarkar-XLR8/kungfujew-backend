import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import config from '../config/app.config';
import { EmailService } from '../services/email.service';
import { EmailQueueService } from '../queues/email/email.queue';
import { EmailProcessor } from '../queues/email/email.processor';
import { DatabaseModule } from '../../database/database.module';
import { EmailHistory, EmailHistorySchema } from '../../database/schemas';
import { OrderSchema } from '../../modules/customer/schemas/order.schema';
import { AdminOrderQueueService } from '../queues/order/admin-order.queue';
import { AdminOrderProcessor } from '../queues/order/admin-order.processor';
import {
  ADMIN_ORDER_QUEUE,
  CUSTOMER_QUOTATION_QUEUE,
  EMAIL_QUEUE,
} from '../queues/queue.constants';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([
      { name: EmailHistory.name, schema: EmailHistorySchema },
      { name: 'Order', schema: OrderSchema },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        username: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: null,
      },
      prefix: `${config.redis_cache_key_prefix}:bull`,
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
    BullModule.registerQueue({
      name: ADMIN_ORDER_QUEUE,
    }),
    BullModule.registerQueue({
      name: CUSTOMER_QUOTATION_QUEUE,
    }),
  ],
  providers: [
    EmailQueueService,
    EmailProcessor,
    EmailService,
    AdminOrderQueueService,
    AdminOrderProcessor,
  ],
  exports: [BullModule, EmailQueueService, AdminOrderQueueService],
})
export class QueueModule {}
