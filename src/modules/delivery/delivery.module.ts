import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { OrderSchema } from '../customer/schemas/order.schema';
import { DeliveryHandlerService } from './delivery-handler.service';

@Module({
  imports: [
    QuickBooksModule,
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
  ],
  providers: [DeliveryHandlerService],
  exports: [DeliveryHandlerService],
})
export class DeliveryModule {}
