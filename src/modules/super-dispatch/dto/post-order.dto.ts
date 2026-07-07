export interface VenueLocation {
  name?: string;
  street?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  aptOrSuite?: string;
  scheduledAt?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface VehicleEntry {
  vin?: string;
  year: number;
  make: string;
  model: string;
  type: string;
  condition?: string;
  color?: string;
  licensePlate?: string;
  isOperable?: boolean;
  notes?: string;
}

export interface CustomerPaymentMatrix {
  depositAmount: number;
  balanceAmount: number;
  totalAmount: number;
  paymentMethod: string;
  currency?: string;
}

export interface PostOrderDto {
  referenceNumber?: string;
  externalOrderId: string;
  origin: VenueLocation;
  destination: VenueLocation;
  vehicles: VehicleEntry[];
  customerPayment: CustomerPaymentMatrix;
  transportType?: string;
  timelineType?: string;
  specialInstructions?: string;
  distance?: number;
}
