import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../../common/common.module';
import { AuthUser, AuthUserSchema } from '../../database/schemas';
import { OrderSchema } from '../customer/schemas/order.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: AuthUser.name, schema: AuthUserSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
