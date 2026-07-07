import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../../common/common.module';
import { AuthUser, AuthUserSchema, PricingPresetModel } from '../../database/schemas';
import { OrderSchema } from '../customer/schemas/order.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PricingPresetController } from './pricing-preset.controller';
import { PricingPresetService } from './pricing-preset.service';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: AuthUser.name, schema: AuthUserSchema },
      PricingPresetModel,
    ]),
  ],
  controllers: [AdminController, PricingPresetController],
  providers: [AdminService, PricingPresetService],
  exports: [PricingPresetService],
})
export class AdminModule {}
