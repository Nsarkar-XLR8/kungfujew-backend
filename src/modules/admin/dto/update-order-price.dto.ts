import { Transform, Type } from 'class-transformer';
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
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class UpdateOrderPriceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseApiPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transportMarkupFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  conditionPremiumFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightSurchargeFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  timelinePremiumFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  additionalDiscountTotal?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmManualPaymentDto {
  @IsEnum(PaymentOption)
  paymentOption: PaymentOption;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountReceived: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  markBalancePaid?: boolean = false;
}
