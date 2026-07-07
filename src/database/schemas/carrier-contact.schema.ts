import { Schema, Document } from 'mongoose';

export interface ICarrierContact extends Document {
  email: string;
  companyName: string;
  phone?: string;
  isActive: boolean;
  optedInAt: Date;
  unsubscribeToken?: string;
}

export const CarrierContactSchema = new Schema<ICarrierContact>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    optedInAt: { type: Date, default: Date.now },
    unsubscribeToken: { type: String },
  },
  { timestamps: true },
);

export const CarrierContactModel = {
  name: 'CarrierContact',
  schema: CarrierContactSchema,
};
