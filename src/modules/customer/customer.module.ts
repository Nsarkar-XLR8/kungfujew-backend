import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CustomerFunnelController } from './controllers/customer-funnel.controller';
import { CustomerFunnelService } from './services/customer-funnel.service';
import { OrderSchema } from './schemas/order.schema';
import { CustomerQuotationProcessor } from '../../common/queues/order/customer-quotation.processor';
import { SuperDispatchModule } from '../super-dispatch/super-dispatch.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    // 1. Registers the core persistent document definition maps
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),

    // 2. Configures outbound HTTP client options with strict timeouts for API handshakes
    HttpModule.register({
      timeout: 7000,
      maxRedirects: 3,
    }),

    // 3. Exposes centralized system environmental contexts securely
    ConfigModule,

    // 4. Super Dispatch OAuth2 auth service for pricing API calls
    SuperDispatchModule,
    QuickBooksModule,
    AdminModule,
  ],
  controllers: [CustomerFunnelController],
  providers: [CustomerFunnelService, CustomerQuotationProcessor],
  exports: [CustomerFunnelService], // Exporting service for downstream operational crons if needed
})
export class CustomerModule {}
