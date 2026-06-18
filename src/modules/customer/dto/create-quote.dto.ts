import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum TransportType {
  OPEN = 'Open',
  ENCLOSED = 'Enclosed',
}

export enum TimelineType {
  NORMAL = 'Normal',
  EXPEDITED = 'Expedited',
}

export enum VehicleCondition {
  RUNNING = 'Running',
  NON_RUNNING = 'Non-Running',
}

export enum VehicleType {
  SEDAN = 'Sedan',
  COUPE = 'Coupe',
  SUV = 'SUV',
  PICKUP_TRUCK = 'Pickup Truck',
  VAN = 'Van',
  MOTORCYCLE = 'Motorcycle',
  HEAVY_EQUIPMENT = 'Heavy Equipment',
  GENERAL_FREIGHT = 'General Freight',
  OTHER = 'Other',
}

export class CreateQuoteDto {
  // --- Customer Meta Details ---
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required.' })
  customerName: string;

  @IsString()
  @IsNotEmpty({ message: 'Customer phone number is required.' })
  customerPhone: string;

  @IsString()
  @IsNotEmpty({ message: 'Customer email address is required.' })
  customerEmail: string;

  // --- Shipment Details ---
  @IsString()
  @IsNotEmpty({
    message: 'Pickup location details (City, State, or ZIP) are required.',
  })
  pickupLocation: string;

  @IsString()
  @IsNotEmpty({
    message: 'Delivery location details (City, State, or ZIP) are required.',
  })
  deliveryLocation: string;

  @IsDateString(
    {},
    { message: 'Pickup availability must be a valid date string.' },
  )
  @IsNotEmpty({ message: 'Pickup availability date is required.' })
  pickupAvailableDate: string;

  @IsDateString(
    {},
    { message: 'Delivery availability window must be a valid date string.' },
  )
  @IsOptional()
  deliveryAvailableDate?: string;

  // --- Vehicle Parameters ---
  @IsNumber()
  @IsNotEmpty({ message: 'Vehicle year is required.' })
  @Type(() => Number)
  vehicleYear: number;

  @IsEnum(VehicleType, {
    message: 'Please select a valid vehicle type classification.',
  })
  @IsNotEmpty({ message: 'Vehicle type selection is required.' })
  vehicleType: VehicleType;

  @IsString()
  @IsNotEmpty({ message: 'Vehicle make/brand is required.' })
  vehicleMake: string;

  @IsString()
  @IsNotEmpty({ message: 'Vehicle model name is required.' })
  vehicleModel: string;

  @IsEnum(VehicleCondition, {
    message: 'Condition must be either Running or Non-Running.',
  })
  @IsNotEmpty({ message: 'Vehicle condition status is required.' })
  condition: VehicleCondition;

  // --- Shipping Preferences ---
  @IsEnum(TransportType, {
    message: 'Transport type must be either Open or Enclosed.',
  })
  @IsNotEmpty({ message: 'Transport type selection is required.' })
  transportType: TransportType;

  @IsEnum(TimelineType, { message: 'Timeline priority selection is required.' })
  @IsNotEmpty({ message: 'Timeline priority selection is required.' })
  timelineType: TimelineType;

  // --- Cargo Specifications ---
  @IsNumber({}, { message: 'In-car freight weight must be a valid number.' })
  @Min(0, { message: 'Freight weight cannot be negative.' })
  @Max(250, {
    message: 'Freight weight cannot exceed the maximum allowance of 250 lbs.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? 0 : value,
  )
  @Type(() => Number)
  inCarFreightWeight?: number = 0;
}
