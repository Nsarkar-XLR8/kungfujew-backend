import { Schema, Document } from 'mongoose';

export interface IQuickBooksConnection extends Document {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  companyName?: string;
  isActive: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
}

export const QuickBooksConnectionSchema = new Schema<IQuickBooksConnection>(
  {
    realmId: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshTokenExpiresAt: { type: Date, required: true },
    companyName: { type: String },
    isActive: { type: Boolean, default: true },
    connectedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date },
  },
  { timestamps: true },
);

export const QuickBooksConnectionModel = {
  name: 'QuickBooksConnection',
  schema: QuickBooksConnectionSchema,
};
