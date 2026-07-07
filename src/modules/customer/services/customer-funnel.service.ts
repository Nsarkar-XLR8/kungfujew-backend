import {
  OnModuleDestroy,
  Injectable,
  BadRequestException,
  NotFoundException,
  GoneException,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { Queue, QueueEvents } from 'bullmq';
import { REDIS_CLIENT } from '../../../common/modules/redis.module';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  CreateQuoteDto,
  TransportType,
  TimelineType,
  VehicleCondition,
  VehicleType,
} from '../dto/create-quote.dto';
import { ProcessBookingDto } from '../dto/process-booking.dto';
import {
  IOrder,
  OrderStatus,
  PaymentOption,
  PaymentMethod,
} from '../schemas/order.schema';
import { AdminOrderQueueService } from '../../../common/queues/order/admin-order.queue';
import { CUSTOMER_QUOTATION_QUEUE } from '../../../common/queues/queue.constants';
import { SuperDispatchAuthService } from '../../super-dispatch/super-dispatch-auth.service';
import { QuickBooksPaymentService } from '../../quickbooks/quickbooks-payment.service';
import { PricingPresetService } from '../../admin/pricing-preset.service';
import { EmailQueueService } from '../../../common/queues/email/email.queue';

@Injectable()
export class CustomerFunnelService implements OnModuleDestroy {
  // 47 Minutes Casino-Style Countdown Timer Rule (47 * 60 seconds)
  private readonly CASINO_TIMER_TTL = 2820;
  private readonly quotationQueueEvents: QueueEvents;

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(CUSTOMER_QUOTATION_QUEUE)
    private readonly quotationQueue: Queue<CreateQuoteDto>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly adminOrderQueueService: AdminOrderQueueService,
    private readonly superDispatchAuth: SuperDispatchAuthService,
    private readonly quickBooksPayment: QuickBooksPaymentService,
    private readonly pricingPreset: PricingPresetService,
    private readonly emailQueue: EmailQueueService,
  ) {
    this.quotationQueueEvents = new QueueEvents(CUSTOMER_QUOTATION_QUEUE, {
      connection: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        username: this.configService.get<string>('REDIS_USER'),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        maxRetriesPerRequest: null,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quotationQueueEvents.close();
  }

  /**
   * Step 1.5: Fetches live API baseline rates, calculates structural markups,
   * generates tracking IDs, and stores reference tokens inside active Redis caches.
   */
  async generateInstantQuote(dto: CreateQuoteDto): Promise<any> {
    const job = await this.quotationQueue.add('generate-quote', dto, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1500 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    await this.redis.set(
      `customer:quote-job:${job.id}`,
      JSON.stringify({ status: 'queued', jobId: job.id }),
      'EX',
      60 * 60,
    );

    try {
      const result = await job.waitUntilFinished(
        this.quotationQueueEvents,
        12000,
      );
      return { quoteJobId: job.id, ...((result || {}) as object) };
    } catch (error) {
      return {
        quoteJobId: job.id,
        status: 'queued',
        message:
          'Quote calculation is queued. Poll the quote job endpoint for the result.',
      };
    }
  }

  async getQuotationJobStatus(jobId: string): Promise<any> {
    const cached = await this.redis.get(`customer:quote-job:${jobId}`);
    if (!cached) {
      return {
        jobId,
        status: 'not_found',
      };
    }

    return JSON.parse(cached);
  }

  async calculateAndPersistQuote(dto: CreateQuoteDto): Promise<any> {
    // High-level payload security limit validation
    if (dto.inCarFreightWeight > 250) {
      throw new BadRequestException(
        'Personal property cargo cannot exceed the maximum limitation of 250 lbs.',
      );
    }

    // 1. Fetch live baseline route cost from external APIs with active HTTP handshakes
    const baseApiPrice = await this.fetchBaselineMarketPrice(
      dto.pickupLocation,
      dto.deliveryLocation,
      dto.vehicleType,
    );

    // 2. Compute dynamic markup structures from DB pricing presets
    const [openMarkup, enclosedMarkup, nonRunningPremium, freight150, freight250, expeditePremium, casinoDiscount] =
      await Promise.all([
        this.pricingPreset.getValue('OPEN_MARKUP', 400),
        this.pricingPreset.getValue('ENCLOSED_MARKUP', 500),
        this.pricingPreset.getValue('NON_RUNNING_PREMIUM', 200),
        this.pricingPreset.getValue('FREIGHT_150_LBS', 150),
        this.pricingPreset.getValue('FREIGHT_250_LBS', 250),
        this.pricingPreset.getValue('EXPEDITED_PREMIUM', 300),
        this.pricingPreset.getValue('CASINO_DISCOUNT', 100),
      ]);

    const transportMarkupFee =
      dto.transportType === TransportType.OPEN ? openMarkup : enclosedMarkup;
    const conditionPremiumFee =
      dto.condition === VehicleCondition.NON_RUNNING ? nonRunningPremium : 0.0;

    let freightSurchargeFee = 0.0;
    const weight = dto.inCarFreightWeight || 0;
    if (weight > 100 && weight <= 150) freightSurchargeFee = freight150;
    if (weight > 150 && weight <= 250) freightSurchargeFee = freight250;

    const timelinePremiumFee =
      dto.timelineType === TimelineType.EXPEDITED ? expeditePremium : 0.0;

    const casinoDiscountAmount = -Math.abs(casinoDiscount);

    // Calculate baseline net quote evaluation figures
    const subTotal =
      baseApiPrice +
      transportMarkupFee +
      conditionPremiumFee +
      freightSurchargeFee +
      timelinePremiumFee +
      casinoDiscountAmount;
    const orderId = this.generateDeterministicOrderId(
      dto.customerPhone,
      dto.customerName,
    );

    const quoteGeneratedAt = new Date();
    const discountExpiresAt = new Date(
      quoteGeneratedAt.getTime() + this.CASINO_TIMER_TTL * 1000,
    );

    const createdQuote = new this.orderModel({
      orderId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      pickupLocation: dto.pickupLocation,
      deliveryLocation: dto.deliveryLocation,
      pickupAvailableDate: new Date(dto.pickupAvailableDate),
      deliveryAvailableDate: dto.deliveryAvailableDate
        ? new Date(dto.deliveryAvailableDate)
        : undefined,
      vehicleYear: dto.vehicleYear,
      vehicleType: dto.vehicleType,
      vehicleMake: dto.vehicleMake,
      vehicleModel: dto.vehicleModel,
      condition: dto.condition,
      inCarFreightWeight: weight,
      hasAcknowledgedWindowWarning: false,
      transportType: dto.transportType,
      timelineType: dto.timelineType,
      baseApiPrice,
      transportMarkupFee,
      conditionPremiumFee,
      freightSurchargeFee,
      timelinePremiumFee,
      casinoDiscountAmount,
      additionalDiscountTotal: 0.0,
      subTotal,
      grandTotalPrice: subTotal, // Matches subtotal initially before checkout processor updates
      quoteGeneratedAt,
      discountExpiresAt,
      status: OrderStatus.QUOTE_GENERATED,
    });

    await createdQuote.save();
    await this.redis.set(
      `timer:casino:${orderId}`,
      'ACTIVE',
      'EX',
      this.CASINO_TIMER_TTL,
    );

    return {
      orderId,
      finalCalculatedPrice: subTotal,
      instantDiscountApplied: casinoDiscountAmount,
      warningDisclaimer:
        'Do not block windows. Personal property in the vehicle is not covered by insurance.',
      uxTriggers: {
        launchWinningDiscountVideoModal: true,
        countdownDurationSeconds: this.CASINO_TIMER_TTL,
        postBookingExpectationsVideoUrl:
          'https://cdn.carcarriergroup.com/assets/expectations.mp4',
      },
    };
  }

  /**
   * Step 1.8: Evaluates active countdown token metrics, registers billing structures,
   * injects QuickBooks merchant processing fees mathematically sound, and initiates triggers.
   */
  async processBookingCheckout(dto: ProcessBookingDto): Promise<any> {
    const order = await this.orderModel.findOne({ orderId: dto.orderId });
    if (!order) {
      throw new NotFoundException(
        `No transactional record exists for order ID: ${dto.orderId}`,
      );
    }
    if (order.status !== OrderStatus.QUOTE_GENERATED) {
      throw new BadRequestException(
        'This pipeline routing operation is closed or already booked.',
      );
    }

    // 1. Audit high-urgency countdown timer validations via Redis
    const isTimerTokenValid = await this.redis.get(
      `timer:casino:${dto.orderId}`,
    );

    if (!isTimerTokenValid) {
      order.casinoDiscountAmount = 0.0;
      order.subTotal =
        order.baseApiPrice +
        order.transportMarkupFee +
        order.conditionPremiumFee +
        order.freightSurchargeFee +
        order.timelinePremiumFee;
      order.grandTotalPrice = order.subTotal;
      order.status = OrderStatus.CANCELLED;
      await order.save();

      throw new GoneException(
        'The 47-minute professional booking discount has expired. Pricing has updated to standard indices.',
      );
    }

    // Assign customer selections
    order.paymentOption = dto.paymentOption;
    order.paymentMethod = dto.paymentMethod;
    order.hasAcknowledgedWindowWarning = dto.hasAcknowledgedWindowWarning;
    order.isInstantDiscountClaimed = true;

    // Evaluate promotional codes first to modify the base subtotal dynamically
    this.evaluateCheckoutPromotions(order, dto);

    // 2. Compute financial split models safely
    let baseChargeTarget = 0.0;
    if (dto.paymentOption === PaymentOption.DEPOSIT_30) {
      baseChargeTarget = order.subTotal * 0.3;
      order.depositAmountCalculated = baseChargeTarget;
      order.balanceAmountRemaining = order.subTotal - baseChargeTarget;
    } else {
      baseChargeTarget = order.subTotal;
      order.depositAmountCalculated = order.subTotal;
      order.balanceAmountRemaining = 0.0;
    }

    // 3. Apply QuickBooks processing surcharge
    const surchargeRate = dto.paymentMethod === PaymentMethod.QUICKBOOKS ? 0.035 : 0;
    const processingFeeQuickBooks = baseChargeTarget * surchargeRate;
    order.processingFeeQuickBooks = processingFeeQuickBooks;
    order.grandTotalPrice = order.subTotal + processingFeeQuickBooks;
    const totalToCharge = baseChargeTarget + processingFeeQuickBooks;

    // 4. Process real QuickBooks payment or mark as pending manual
    if (dto.paymentMethod === PaymentMethod.QUICKBOOKS) {
      const chargeResult = await this.quickBooksPayment.charge(
        totalToCharge,
        'USD',
        `Vehicle transport: ${order.orderId}`,
        order.customerEmail,
      );

      if (!chargeResult.success) {
        order.status = OrderStatus.PENDING_PAYMENT;
        order.isDepositPaid = false;
        order.paymentDetails = {
          transactionChannel: 'QuickBooks API Gateway',
          error: chargeResult.error,
          attemptedAt: new Date(),
        };
      } else {
        order.status = OrderStatus.BOOKED;
        order.isDepositPaid = true;
        if (dto.paymentOption === PaymentOption.FULL_UPFRONT) {
          order.isBalancePaid = true;
          order.isBalanceAlertActive = false;
        } else {
          order.isBalancePaid = false;
          order.isBalanceAlertActive = true;
        }
        order.paymentDetails = {
          transactionChannel: 'QuickBooks API Gateway',
          transactionId: chargeResult.transactionId,
          amountCaptured: chargeResult.amountCharged,
          timestamp: new Date(),
        };
      }
    } else {
      order.status = OrderStatus.PENDING_PAYMENT;
      order.isDepositPaid = false;
      order.isBalancePaid = false;
      order.isBalanceAlertActive = false;
      order.paymentDetails = {
        transactionChannel: `Manual ${dto.paymentMethod} Route`,
        amountAwaitingClearance: totalToCharge,
        instructionsRendered: true,
      };
    }

    await order.save();

    if (order.status === OrderStatus.BOOKED) {
      await this.redis.del(`timer:casino:${dto.orderId}`);
      await this.adminOrderQueueService.enqueueOrderBooked(order.orderId);
      if (order.customerEmail) {
        await this.emailQueue.sendBookingConfirmation(
          order.customerEmail,
          order.customerName || 'Valued Customer',
          order.orderId,
          {
            vehicleYear: order.vehicleYear || 0,
            vehicleMake: order.vehicleMake || '',
            vehicleModel: order.vehicleModel || '',
            pickupLocation: order.pickupLocation || '',
            deliveryLocation: order.deliveryLocation || '',
            transportType: order.transportType || 'open',
            totalPrice: order.grandTotalPrice || 0,
            depositPaid: order.depositAmountCalculated || 0,
            balanceDue: order.balanceAmountRemaining || 0,
          },
        );
      }
    }

    return {
      orderId: order.orderId,
      currentLifecycleStatus: order.status,
      checkoutAmountProcessed: totalToCharge,
      paymentSuccessful: order.isDepositPaid,
      billingSchedules: {
        immediateChargeBasis: totalToCharge,
        outstandingDeferredBalance: order.balanceAmountRemaining,
        quickBooksSurchargeInjected: order.processingFeeQuickBooks,
        absoluteGrandTotal: order.grandTotalPrice,
      },
    };
  }

  async getTimerRemainingSeconds(
    orderId: string,
  ): Promise<{ active: boolean; ttlSeconds: number }> {
    const ttl = await this.redis.ttl(`timer:casino:${orderId}`);
    return { active: ttl > 0, ttlSeconds: ttl > 0 ? ttl : 0 };
  }

  /**
   * Primary + Failover Core API Routing Engine for Lane Value Extractions
   */
  private async fetchBaselineMarketPrice(
    pickup: string,
    delivery: string,
    type: VehicleType,
  ): Promise<number> {
    try {
      const superDispatchPrice = await this.querySuperDispatchPricingInsights(
        pickup,
        delivery,
        type,
      );
      if (superDispatchPrice && superDispatchPrice > 0)
        return superDispatchPrice;

      throw new Error(
        'Super Dispatch returned empty dataset matrices for requested lane parameters.',
      );
    } catch (error) {
      console.warn(
        `Primary Super Dispatch network path failed. Engaging secondary failover route. Reason: ${error.message}`,
      );

      try {
        return await this.queryCentralDispatchMarketIntelligence(
          pickup,
          delivery,
          type,
        );
      } catch (fallbackError) {
        console.error(
          `Critical Failure: All primary and secondary carrier networks timed out. Deploying default safety indices.`,
        );
        return 750.0;
      }
    }
  }

  /**
   * REAL Super Dispatch Pricing API Implementation via OAuth2 Client Credentials
   * Uses the token from SuperDispatchAuthService and the v1/market-rates endpoint.
   */
  private async querySuperDispatchPricingInsights(
    pickup: string,
    delivery: string,
    type: VehicleType,
  ): Promise<number> {
    const apiUrl =
      this.configService.get<string>('SUPER_DISPATCH_BASE_URL') ||
      'https://api.shipper.superdispatch.com';
    const token = await this.superDispatchAuth.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get<any>(`${apiUrl}/v1/market-rates`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: { origin: pickup, destination: delivery, vehicle_type: type },
      }),
    );

    return response.data?.medianPrice || response.data?.price || 0;
  }

  /**
   * ACTUAL Central Dispatch Pricing API Implementation Interfacer
   */
  private async queryCentralDispatchMarketIntelligence(
    pickup: string,
    delivery: string,
    type: VehicleType,
  ): Promise<number> {
    const apiUrl =
      this.configService.get<string>('CENTRAL_DISPATCH_API_URL') ||
      'https://api.centraldispatch.com/v1/market-intelligence';
    const apiKey = this.configService.get<string>('CENTRAL_DISPATCH_API_KEY');

    if (!apiKey) {
      throw new Error(
        'Missing Central Dispatch API credential configuration context.',
      );
    }

    const response = await firstValueFrom(
      this.httpService.get<any>(apiUrl, {
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        params: {
          pickup_location: pickup,
          delivery_location: delivery,
          classification: type,
        },
      }),
    );

    return response.data?.marketAverage || response.data?.average_price || 0;
  }

  private generateDeterministicOrderId(phone: string, name: string): string {
    const numbersOnly = phone.replace(/\D/g, '');
    const lastFourDigits = numbersOnly.slice(-4) || '0000';
    const words = name.trim().split(/\s+/);
    const firstInitial = words[0] ? words[0].charAt(0).toUpperCase() : 'X';
    const lastInitial =
      words.length > 1 ? words[words.length - 1].charAt(0).toUpperCase() : 'X';
    return `CCG-${lastFourDigits}${firstInitial}${lastInitial}`;
  }

  private evaluateCheckoutPromotions(order: any, dto: ProcessBookingDto): void {
    let additionalDiscountTotal = 0.0;
    if (dto.isMilitaryDiscountApplied) {
      order.isMilitaryDiscountApplied = true;
      additionalDiscountTotal += 35.0;
    }
    if (dto.isStudentDiscountApplied) {
      order.isStudentDiscountApplied = true;
      additionalDiscountTotal += 25.0;
    }
    if (dto.isSeniorDiscountApplied) {
      order.isSeniorDiscountApplied = true;
      additionalDiscountTotal += 30.0;
    }
    if (dto.appliedPromoCode) {
      order.appliedPromoCode = dto.appliedPromoCode;
      additionalDiscountTotal += 50.0;
    }

    if (additionalDiscountTotal > 0) {
      order.additionalDiscountTotal = additionalDiscountTotal;
      order.subTotal = Math.max(0, order.subTotal - additionalDiscountTotal);
    }
  }
}
