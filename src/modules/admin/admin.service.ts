import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AdminOrderQueryDto,
  ConfirmManualPaymentDto,
  ReviewOrderDto,
  UpdateOrderPriceDto,
} from './dto/update-order-price.dto';
import {
  IOrder,
  OrderStatus,
  PaymentMethod,
  PaymentOption,
} from '../customer/schemas/order.schema';
import { AdminOrderQueueService } from '../../common/queues/order/admin-order.queue';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<IOrder>,
    private readonly adminOrderQueueService: AdminOrderQueueService,
  ) {}

  async listOrders(queryDto: AdminOrderQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const query = this.buildOrderQuery(queryDto);

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(orderId: string) {
    return this.findOrder(orderId);
  }

  async updateOrderPrice(
    orderId: string,
    dto: UpdateOrderPriceDto,
    actorId?: string,
  ) {
    const order = await this.findOrder(orderId);

    const adjustableFields: Array<keyof UpdateOrderPriceDto> = [
      'baseApiPrice',
      'transportMarkupFee',
      'conditionPremiumFee',
      'freightSurchargeFee',
      'timelinePremiumFee',
      'additionalDiscountTotal',
    ];

    for (const field of adjustableFields) {
      if (dto[field] !== undefined) {
        (order as unknown as Record<string, number>)[field] = dto[
          field
        ] as number;
      }
    }

    this.recalculateOrderTotals(order);
    order.adminNotes = dto.reason || order.adminNotes;
    order.lastPriceUpdatedBy = actorId;
    order.lastPriceUpdatedAt = new Date();

    await order.save();

    return {
      success: true,
      message: 'Order price updated successfully',
      data: order,
    };
  }

  async reviewOrder(orderId: string, dto: ReviewOrderDto, actorId?: string) {
    const order = await this.findOrder(orderId);

    order.isReviewedByStaff = true;
    order.reviewedBy = actorId;
    order.reviewedAt = new Date();
    order.adminNotes = dto.notes || order.adminNotes;

    await order.save();
    const jobId = await this.adminOrderQueueService.enqueueOrderReviewed(
      orderId,
      actorId,
      { notes: dto.notes },
    );

    return {
      success: true,
      message: 'Order marked as reviewed',
      jobId,
      data: order,
    };
  }

  async approveOrder(orderId: string, actorId?: string) {
    const order = await this.findOrder(orderId);

    if (order.status !== OrderStatus.BOOKED) {
      throw new BadRequestException(
        'Only booked orders can be approved for dispatch.',
      );
    }

    order.status = OrderStatus.APPROVED;
    order.isReviewedByStaff = true;
    order.approvedBy = actorId;
    order.approvedAt = new Date();

    await order.save();
    const jobId = await this.adminOrderQueueService.enqueueOrderApproved(
      orderId,
      actorId,
    );

    return {
      success: true,
      message: 'Order approved and dispatch automation queued',
      jobId,
      data: order,
    };
  }

  async confirmManualPayment(
    orderId: string,
    dto: ConfirmManualPaymentDto,
    actorId?: string,
  ) {
    const order = await this.findOrder(orderId);

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Manual payment confirmation is only available for pending payment orders.',
      );
    }

    order.paymentOption = dto.paymentOption;
    order.paymentMethod = dto.paymentMethod;
    order.status = OrderStatus.BOOKED;
    order.isDepositPaid = true;
    order.isBalancePaid =
      dto.markBalancePaid || dto.paymentOption === PaymentOption.FULL_UPFRONT;
    order.isBalanceAlertActive = !order.isBalancePaid;

    if (dto.paymentOption === PaymentOption.DEPOSIT_30) {
      order.depositAmountCalculated = dto.amountReceived;
      order.balanceAmountRemaining = Math.max(
        0,
        order.subTotal - dto.amountReceived,
      );
    } else {
      order.depositAmountCalculated = order.subTotal;
      order.balanceAmountRemaining = 0;
    }

    order.paymentDetails = {
      ...(order.paymentDetails || {}),
      manualConfirmation: {
        channel: dto.paymentMethod,
        amountReceived: dto.amountReceived,
        reference: dto.reference,
        confirmedBy: actorId,
        confirmedAt: new Date(),
      },
    };

    await order.save();
    const jobId = await this.adminOrderQueueService.enqueueOrderBooked(orderId);

    return {
      success: true,
      message: 'Manual payment confirmed and order moved to review queue',
      jobId,
      data: order,
    };
  }

  async listBalanceDue(queryDto: AdminOrderQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const query = {
      ...this.buildOrderQuery(queryDto),
      isBalancePaid: false,
      balanceAmountRemaining: { $gt: 0 },
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendBalanceReminder(orderId: string, actorId?: string) {
    const order = await this.findOrder(orderId);

    if (order.isBalancePaid || order.balanceAmountRemaining <= 0) {
      throw new BadRequestException('This order has no outstanding balance.');
    }

    const jobId = await this.adminOrderQueueService.enqueueBalanceReminder(
      orderId,
      actorId,
    );

    return {
      success: true,
      message: 'Balance reminder queued',
      jobId,
    };
  }

  private async findOrder(orderId: string): Promise<IOrder> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found.`);
    }
    return order;
  }

  private buildOrderQuery(
    queryDto: AdminOrderQueryDto,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (queryDto.status) {
      query.status = queryDto.status;
    }

    if (queryDto.search) {
      const search = { $regex: queryDto.search, $options: 'i' };
      query.$or = [
        { orderId: search },
        { customerName: search },
        { customerEmail: search },
        { customerPhone: search },
        { pickupLocation: search },
        { deliveryLocation: search },
      ];
    }

    return query;
  }

  private recalculateOrderTotals(order: IOrder): void {
    order.subTotal = Math.max(
      0,
      order.baseApiPrice +
        order.transportMarkupFee +
        order.conditionPremiumFee +
        order.freightSurchargeFee +
        order.timelinePremiumFee +
        order.casinoDiscountAmount -
        order.additionalDiscountTotal,
    );

    if (order.paymentOption === PaymentOption.DEPOSIT_30) {
      order.depositAmountCalculated = order.subTotal * 0.3;
      order.balanceAmountRemaining =
        order.subTotal - order.depositAmountCalculated;
    } else if (order.paymentOption === PaymentOption.FULL_UPFRONT) {
      order.depositAmountCalculated = order.subTotal;
      order.balanceAmountRemaining = 0;
    }

    const quickBooksFee =
      order.paymentMethod === PaymentMethod.QUICKBOOKS
        ? order.depositAmountCalculated * 0.035
        : 0;

    order.processingFeeQuickBooks = quickBooksFee;
    order.grandTotalPrice = order.subTotal + quickBooksFee;
  }
}
