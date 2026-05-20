import { Schema, model, Document } from 'mongoose';
import {
  TransportType,
  TimelineType,
  VehicleCondition,
  VehicleType,
} from '../dto/create-quote.dto';

export enum PaymentOption {
  DEPOSIT_30 = '30% Deposit',
  FULL_UPFRONT = 'Full Payment',
}

export enum PaymentMethod {
  QUICKBOOKS = 'QuickBooks',
  ZELLE = 'Zelle',
  VENMO = 'Venmo',
  CASH_APP = 'Cash App',
}

export enum OrderStatus {
  QUOTE_GENERATED = 'Quote Generated',
  PENDING_PAYMENT = 'Pending Payment',
  BOOKED = 'Booked', // Paid & awaiting admin approval review
  APPROVED = 'Approved', // Reviewed by staff, ready to blast load boards
  DISPATCHED = 'Dispatched',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export interface IOrder extends Document {
  orderId: string; // Format: CCG-[last 4 phone][first initial][last initial]
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  // Shipment Details & Time Constraint Windows
  pickupLocation: string;
  deliveryLocation: string;
  pickupAvailableDate: Date;
  deliveryAvailableDate?: Date;

  // Vehicle Parameters
  vehicleYear: number;
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  condition: VehicleCondition;
  inCarFreightWeight: number;
  hasAcknowledgedWindowWarning: boolean; // MANDATORY Insurance Disclaimer Toggle

  // Shipping Service Toggles
  transportType: TransportType;
  timelineType: TimelineType;

  // Dynamic Promo Toggle States
  isMilitaryDiscountApplied: boolean;
  isStudentDiscountApplied: boolean;
  isSeniorDiscountApplied: boolean;
  appliedPromoCode?: string;

  // Granular Financial Reconciliation Ledger
  baseApiPrice: number; // Super Dispatch API Baseline return
  transportMarkupFee: number; // +400 Open / +500 Enclosed
  conditionPremiumFee: number; // +200 Non-Running
  freightSurchargeFee: number; // Tiered: +150 (101-150lbs) / +250 (151-250lbs)
  timelinePremiumFee: number; // +300 Expedited
  casinoDiscountAmount: number; // -$100 Instant Discount
  additionalDiscountTotal: number; // Cumulative total of active promo toggles
  subTotal: number;
  processingFeeQuickBooks: number; // +3.5% applied dynamically on checkout selection
  grandTotalPrice: number;

  // Casino-Style 47-Minute Window Constraints
  quoteGeneratedAt: Date;
  discountExpiresAt: Date; // quoteGeneratedAt + 47 minutes
  isInstantDiscountClaimed: boolean;

  // Checkout Operations & Automation Hooks
  paymentOption?: PaymentOption;
  paymentMethod?: PaymentMethod;
  isDepositPaid: boolean;
  isBalancePaid: boolean;
  depositAmountCalculated: number;
  balanceAmountRemaining: number;
  paymentDetails?: any;

  // Automated Alert Reminders State Logic
  isBalanceAlertActive: boolean; // Controls automated cron messaging targeting
  lastReminderSentAt?: Date;
  reminderCount: number;

  // System Pipeline Controls
  status: OrderStatus;
  isReviewedByStaff: boolean; // Must hit true to authorize automated push to load boards
  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    pickupLocation: { type: String, required: true },
    deliveryLocation: { type: String, required: true },
    pickupAvailableDate: { type: Date, required: true },
    deliveryAvailableDate: { type: Date },

    vehicleYear: { type: Number, required: true },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
    },
    vehicleMake: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    condition: {
      type: String,
      enum: Object.values(VehicleCondition),
      required: true,
    },
    inCarFreightWeight: { type: Number, default: 0 },
    hasAcknowledgedWindowWarning: { type: Boolean, default: false },

    transportType: {
      type: String,
      enum: Object.values(TransportType),
      required: true,
    },
    timelineType: {
      type: String,
      enum: Object.values(TimelineType),
      required: true,
    },

    // Discount Toggles
    isMilitaryDiscountApplied: { type: Boolean, default: false },
    isStudentDiscountApplied: { type: Boolean, default: false },
    isSeniorDiscountApplied: { type: Boolean, default: false },
    appliedPromoCode: { type: String, trim: true },

    // Financial Breakdown Components
    baseApiPrice: { type: Number, required: true, default: 0 },
    transportMarkupFee: { type: Number, required: true, default: 0 },
    conditionPremiumFee: { type: Number, required: true, default: 0 },
    freightSurchargeFee: { type: Number, required: true, default: 0 },
    timelinePremiumFee: { type: Number, required: true, default: 0 },
    casinoDiscountAmount: { type: Number, default: 0 },
    additionalDiscountTotal: { type: Number, default: 0 },
    subTotal: { type: Number, required: true, default: 0 },
    processingFeeQuickBooks: { type: Number, default: 0 },
    grandTotalPrice: { type: Number, required: true, default: 0 },

    // 47-Minute Casino Window Trackers
    quoteGeneratedAt: { type: Date, required: true, default: Date.now },
    discountExpiresAt: { type: Date, required: true },
    isInstantDiscountClaimed: { type: Boolean, default: false },

    // Checkout Ledger States
    paymentOption: { type: String, enum: Object.values(PaymentOption) },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod) },
    isDepositPaid: { type: Boolean, default: false },
    isBalancePaid: { type: Boolean, default: false },
    depositAmountCalculated: { type: Number, default: 0 },
    balanceAmountRemaining: { type: Number, default: 0 },
    paymentDetails: { type: Schema.Types.Mixed },

    // Automated Invoice Reminder System Variables
    isBalanceAlertActive: { type: Boolean, default: false },
    lastReminderSentAt: { type: Date },
    reminderCount: { type: Number, default: 0 },

    // State Machine Flags
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.QUOTE_GENERATED,
    },
    isReviewedByStaff: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// High-performance operational indexing
OrderSchema.index({ status: 1 });
OrderSchema.index({ isReviewedByStaff: 1 });
OrderSchema.index({ isBalanceAlertActive: 1, isBalancePaid: 1 });

export const OrderModel = model<IOrder>('Order', OrderSchema);
