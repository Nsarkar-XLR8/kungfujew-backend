import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IPricingPreset,
  DEFAULT_PRICING_PRESETS,
} from '../../database/schemas/pricing-preset.schema';

@Injectable()
export class PricingPresetService implements OnModuleInit {
  private readonly logger = new Logger(PricingPresetService.name);

  constructor(
    @InjectModel('PricingPreset')
    private readonly presetModel: Model<IPricingPreset>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    for (const preset of DEFAULT_PRICING_PRESETS) {
      await this.presetModel.updateOne(
        { key: preset.key },
        { $setOnInsert: preset },
        { upsert: true },
      );
    }
    this.logger.log(`Seeded ${DEFAULT_PRICING_PRESETS.length} pricing presets`);
  }

  async getAll(): Promise<IPricingPreset[]> {
    return this.presetModel.find().sort({ category: 1, key: 1 }).exec();
  }

  async getByKey(key: string): Promise<IPricingPreset | null> {
    return this.presetModel.findOne({ key }).exec();
  }

  async getValue(key: string, defaultValue: number): Promise<number> {
    const preset = await this.presetModel.findOne({ key }).exec();
    return preset ? preset.value : defaultValue;
  }

  async update(key: string, value: number): Promise<IPricingPreset | null> {
    const preset = await this.presetModel.findOneAndUpdate(
      { key },
      { $set: { value, updatedAt: new Date() } },
      { new: true },
    );
    return preset;
  }
}
