import { Schema, Document } from 'mongoose';

export interface IPricingPreset extends Document {
  key: string;
  value: number;
  label: string;
  description?: string;
  category: string;
  updatedAt: Date;
}

export const PricingPresetSchema = new Schema<IPricingPreset>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    label: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const PricingPresetModel = {
  name: 'PricingPreset',
  schema: PricingPresetSchema,
};

export const DEFAULT_PRICING_PRESETS: Array<{
  key: string;
  value: number;
  label: string;
  description: string;
  category: string;
}> = [
  { key: 'OPEN_MARKUP', value: 400, label: 'Open Transport Markup', description: 'Added to base price for open carrier transport', category: 'transport' },
  { key: 'ENCLOSED_MARKUP', value: 500, label: 'Enclosed Transport Markup', description: 'Added to base price for enclosed carrier transport', category: 'transport' },
  { key: 'NON_RUNNING_PREMIUM', value: 200, label: 'Non-Running Vehicle Premium', description: 'Additional fee for non-running vehicles', category: 'condition' },
  { key: 'FREIGHT_150_LBS', value: 150, label: 'Freight Surcharge (101-150 lbs)', description: 'Fee for in-car freight 101-150 lbs', category: 'freight' },
  { key: 'FREIGHT_250_LBS', value: 250, label: 'Freight Surcharge (151-250 lbs)', description: 'Fee for in-car freight 151-250 lbs', category: 'freight' },
  { key: 'EXPEDITED_PREMIUM', value: 300, label: 'Expedited Timeline Premium', description: 'Additional fee for 1-2 day expedited pickup', category: 'timeline' },
  { key: 'CASINO_DISCOUNT', value: 100, label: 'Instant Casino Discount', description: 'Discount amount for booking within 47-minute window', category: 'discount' },
  { key: 'MILITARY_DISCOUNT', value: 35, label: 'Military Discount', description: 'Discount for military personnel', category: 'discount' },
  { key: 'STUDENT_DISCOUNT', value: 25, label: 'Student Discount', description: 'Discount for students', category: 'discount' },
  { key: 'SENIOR_DISCOUNT', value: 30, label: 'Senior Discount', description: 'Discount for seniors', category: 'discount' },
  { key: 'PROMO_CODE_DISCOUNT', value: 50, label: 'Promotional Code Discount', description: 'Default discount for promo codes', category: 'discount' },
  { key: 'QB_SURCHARGE_RATE', value: 3.5, label: 'QuickBooks Processing Fee (%)', description: 'Percentage surcharge for QuickBooks card payments', category: 'payment' },
];
