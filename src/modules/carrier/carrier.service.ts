import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICarrierContact } from '../../database/schemas/carrier-contact.schema';
import { EmailQueueService } from '../../common/queues/email/email.queue';

@Injectable()
export class CarrierService {
  private readonly logger = new Logger(CarrierService.name);

  constructor(
    @InjectModel('CarrierContact')
    private readonly carrierModel: Model<ICarrierContact>,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async findAll(): Promise<ICarrierContact[]> {
    return this.carrierModel.find({ isActive: true }).sort({ companyName: 1 }).exec();
  }

  async add(email: string, companyName: string, phone?: string): Promise<ICarrierContact> {
    const existing = await this.carrierModel.findOne({ email: email.toLowerCase() }).exec();
    if (existing) {
      existing.isActive = true;
      existing.companyName = companyName;
      if (phone) existing.phone = phone;
      return existing.save();
    }
    return this.carrierModel.create({ email, companyName, phone });
  }

  async remove(email: string): Promise<void> {
    await this.carrierModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { isActive: false } },
    );
  }

  async blastOrderToCarriers(
    orderId: string,
    orderDetails: {
      customerName: string;
      pickupLocation: string;
      deliveryLocation: string;
      vehicleYear: number;
      vehicleMake: string;
      vehicleModel: string;
      transportType: string;
      payout: number;
    },
  ): Promise<number> {
    const carriers = await this.findAll();
    let sentCount = 0;

    for (const carrier of carriers) {
      try {
        await this.emailQueue.sendCarrierJobAlert(
          carrier.email,
          carrier.companyName,
          orderId,
          orderDetails,
        );
        sentCount++;
      } catch (error) {
        this.logger.error(
          `Failed to queue carrier alert to ${carrier.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(`Carrier blast sent to ${sentCount}/${carriers.length} carriers for order ${orderId}`);
    return sentCount;
  }
}
