import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentOption, PaymentMethod } from '../schemas/order.schema';

export class ProcessBookingDto {
  @IsString()
  @IsNotEmpty({
    message: 'Order reference ID is required to process checkout.',
  })
  orderId: string;

  @IsEnum(PaymentOption, {
    message: 'Payment choice must be either "30% Deposit" or "Full Payment".',
  })
  @IsNotEmpty({ message: 'Please select a payment option strategy.' })
  paymentOption: PaymentOption;

  @IsEnum(PaymentMethod, {
    message: 'Payment method must be QuickBooks, Zelle, Venmo, or Cash App.',
  })
  @IsNotEmpty({ message: 'Please specify your preferred payment method.' })
  paymentMethod: PaymentMethod;

  // --- Mandatory Insurance Warning Approval ---
  @IsBoolean({
    message: 'Window acknowledgement warning status must be a clear boolean.',
  })
  @IsNotEmpty({
    message:
      'You must review and accept the window blocking and cargo insurance disclaimer.',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  hasAcknowledgedWindowWarning: boolean;

  // --- Dynamic Additional Discount Toggles at Checkout ---
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isMilitaryDiscountApplied?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isStudentDiscountApplied?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSeniorDiscountApplied?: boolean = false;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : undefined))
  appliedPromoCode?: string;

  // --- Payment Processor Metadata ---
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : undefined))
  paymentToken?: string; // Captured securely for automated QuickBooks merchant API validations
}
