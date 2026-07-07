import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TailwindTmsService } from './tailwind-tms.service';
import { TailwindTmsWebhookController } from './tailwind-tms-webhook.controller';
import { OrderSchema } from '../customer/schemas/order.schema';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ConfigModule,
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
    DeliveryModule,
  ],
  controllers: [TailwindTmsWebhookController],
  providers: [TailwindTmsService],
  exports: [TailwindTmsService],
})
export class TailwindTmsModule {}
