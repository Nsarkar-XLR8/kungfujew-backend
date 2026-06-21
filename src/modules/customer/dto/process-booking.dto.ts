import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentOption, PaymentMethod } from '../schemas/order.schema';

export class ProcessBookingDto {
  @ApiProperty({
    description: 'Order reference returned by the instant quote endpoint.',
    example: 'CCG-7788JD',
  })
  @IsString()
  @IsNotEmpty({
    message: 'Order reference ID is required to process checkout.',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment schedule selected by the customer.',
    enum: PaymentOption,
    example: PaymentOption.DEPOSIT_30,
  })
  @IsEnum(PaymentOption, {
    message: 'Payment choice must be either "30% Deposit" or "Full Payment".',
  })
  @IsNotEmpty({ message: 'Please select a payment option strategy.' })
  paymentOption: PaymentOption;

  @ApiProperty({
    description: 'Payment method selected for checkout.',
    enum: PaymentMethod,
    example: PaymentMethod.QUICKBOOKS,
  })
  @IsEnum(PaymentMethod, {
    message: 'Payment method must be QuickBooks, Zelle, Venmo, or Cash App.',
  })
  @IsNotEmpty({ message: 'Please specify your preferred payment method.' })
  paymentMethod: PaymentMethod;

  // --- Mandatory Insurance Warning Approval ---
  @ApiProperty({
    description:
      'Customer acknowledgement of window-blocking and personal cargo insurance disclaimer.',
    example: true,
  })
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
  @ApiPropertyOptional({
    description: 'Apply the military discount during checkout.',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isMilitaryDiscountApplied?: boolean = false;

  @ApiPropertyOptional({
    description: 'Apply the student discount during checkout.',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isStudentDiscountApplied?: boolean = false;

  @ApiPropertyOptional({
    description: 'Apply the senior discount during checkout.',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSeniorDiscountApplied?: boolean = false;

  @ApiPropertyOptional({
    description: 'Optional promotional code to evaluate during checkout.',
    example: 'SHIP50',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : undefined))
  appliedPromoCode?: string;

  // --- Payment Processor Metadata ---
  @ApiPropertyOptional({
    description:
      'Payment processor token for automated QuickBooks merchant validations.',
    example: 'tok_quickbooks_123',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : undefined))
  paymentToken?: string; // Captured securely for automated QuickBooks merchant API validations
}
