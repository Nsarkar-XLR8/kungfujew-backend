import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  OrderStatus,
  PaymentMethod,
  PaymentOption,
} from '../../customer/schemas/order.schema';

export class AdminOrderQueryDto {
  @ApiPropertyOptional({
    description: 'Filter orders by lifecycle status.',
    enum: OrderStatus,
    example: OrderStatus.BOOKED,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description:
      'Search by order ID, customer name, email, phone, pickup, or delivery location.',
    example: 'CCG-1234JD',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for paginated order results.',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of orders to return per page.',
    example: 20,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class UpdateOrderPriceDto {
  @ApiPropertyOptional({
    description: 'Carrier market baseline price before internal markups.',
    example: 825,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseApiPrice?: number;

  @ApiPropertyOptional({
    description: 'Internal markup based on open or enclosed transport.',
    example: 400,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transportMarkupFee?: number;

  @ApiPropertyOptional({
    description: 'Premium for non-running vehicles.',
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  conditionPremiumFee?: number;

  @ApiPropertyOptional({
    description: 'Fee for approved in-car freight weight.',
    example: 150,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightSurchargeFee?: number;

  @ApiPropertyOptional({
    description: 'Expedited timeline premium.',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  timelinePremiumFee?: number;

  @ApiPropertyOptional({
    description:
      'Total additional discount to subtract from the recalculated order subtotal.',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  additionalDiscountTotal?: number;

  @ApiPropertyOptional({
    description: 'Admin-facing reason or note for the price adjustment.',
    example: 'Matched carrier quote after lane review.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewOrderDto {
  @ApiPropertyOptional({
    description: 'Internal admin notes captured during staff review.',
    example: 'Customer confirmed pickup window and vehicle condition.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmManualPaymentDto {
  @ApiProperty({
    description: 'Customer-selected payment schedule.',
    enum: PaymentOption,
    example: PaymentOption.DEPOSIT_30,
  })
  @IsEnum(PaymentOption)
  paymentOption: PaymentOption;

  @ApiProperty({
    description: 'Manual payment channel confirmed by the admin.',
    enum: PaymentMethod,
    example: PaymentMethod.ZELLE,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Amount received through the selected manual payment channel.',
    example: 375,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountReceived: number;

  @ApiPropertyOptional({
    description: 'External transaction reference, memo, or confirmation ID.',
    example: 'ZELLE-982134',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description:
      'Set true when the manual payment covers the full balance immediately.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  markBalancePaid?: boolean = false;
}
