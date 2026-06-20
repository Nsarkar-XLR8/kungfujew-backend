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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({
    description: 'Full name of the customer requesting the quote.',
    example: 'Jordan Davis',
  })
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required.' })
  customerName: string;

  @ApiProperty({
    description: 'Customer phone number used to generate the order reference.',
    example: '+1 555 010 7788',
  })
  @IsString()
  @IsNotEmpty({ message: 'Customer phone number is required.' })
  customerPhone: string;

  @ApiProperty({
    description: 'Customer email address for quote and booking updates.',
    example: 'jordan@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'Customer email address is required.' })
  customerEmail: string;

  // --- Shipment Details ---
  @ApiProperty({
    description: 'Pickup city, state, ZIP code, or full pickup location.',
    example: 'Los Angeles, CA 90001',
  })
  @IsString()
  @IsNotEmpty({
    message: 'Pickup location details (City, State, or ZIP) are required.',
  })
  pickupLocation: string;

  @ApiProperty({
    description: 'Delivery city, state, ZIP code, or full delivery location.',
    example: 'Miami, FL 33101',
  })
  @IsString()
  @IsNotEmpty({
    message: 'Delivery location details (City, State, or ZIP) are required.',
  })
  deliveryLocation: string;

  @ApiProperty({
    description: 'Earliest pickup availability date in ISO date format.',
    example: '2026-07-01',
  })
  @IsDateString(
    {},
    { message: 'Pickup availability must be a valid date string.' },
  )
  @IsNotEmpty({ message: 'Pickup availability date is required.' })
  pickupAvailableDate: string;

  @ApiPropertyOptional({
    description: 'Optional delivery availability target date in ISO format.',
    example: '2026-07-07',
  })
  @IsDateString(
    {},
    { message: 'Delivery availability window must be a valid date string.' },
  )
  @IsOptional()
  deliveryAvailableDate?: string;

  // --- Vehicle Parameters ---
  @ApiProperty({
    description: 'Vehicle model year.',
    example: 2021,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Vehicle year is required.' })
  @Type(() => Number)
  vehicleYear: number;

  @ApiProperty({
    description: 'Vehicle classification used for lane pricing.',
    enum: VehicleType,
    example: VehicleType.SUV,
  })
  @IsEnum(VehicleType, {
    message: 'Please select a valid vehicle type classification.',
  })
  @IsNotEmpty({ message: 'Vehicle type selection is required.' })
  vehicleType: VehicleType;

  @ApiProperty({
    description: 'Vehicle make or brand.',
    example: 'Toyota',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vehicle make/brand is required.' })
  vehicleMake: string;

  @ApiProperty({
    description: 'Vehicle model name.',
    example: 'RAV4',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vehicle model name is required.' })
  vehicleModel: string;

  @ApiProperty({
    description: 'Whether the vehicle can roll, brake, and steer.',
    enum: VehicleCondition,
    example: VehicleCondition.RUNNING,
  })
  @IsEnum(VehicleCondition, {
    message: 'Condition must be either Running or Non-Running.',
  })
  @IsNotEmpty({ message: 'Vehicle condition status is required.' })
  condition: VehicleCondition;

  // --- Shipping Preferences ---
  @ApiProperty({
    description: 'Open or enclosed carrier preference.',
    enum: TransportType,
    example: TransportType.OPEN,
  })
  @IsEnum(TransportType, {
    message: 'Transport type must be either Open or Enclosed.',
  })
  @IsNotEmpty({ message: 'Transport type selection is required.' })
  transportType: TransportType;

  @ApiProperty({
    description: 'Standard or expedited shipping timeline.',
    enum: TimelineType,
    example: TimelineType.NORMAL,
  })
  @IsEnum(TimelineType, { message: 'Timeline priority selection is required.' })
  @IsNotEmpty({ message: 'Timeline priority selection is required.' })
  timelineType: TimelineType;

  // --- Cargo Specifications ---
  @ApiPropertyOptional({
    description:
      'Personal property weight inside the vehicle. Must not exceed 250 lbs.',
    example: 75,
    default: 0,
    minimum: 0,
    maximum: 250,
  })
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
