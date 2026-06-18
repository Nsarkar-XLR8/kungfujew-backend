import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AdminService } from './admin.service';
import {
  AdminOrderQueryDto,
  ConfirmManualPaymentDto,
  ReviewOrderDto,
  UpdateOrderPriceDto,
} from './dto/update-order-price.dto';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    role?: string;
  };
};

@Controller('admin')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('orders')
  async listOrders(
    @Query() queryDto: AdminOrderQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.listOrders(queryDto);
  }

  @Get('orders/balance-due')
  async listBalanceDue(
    @Query() queryDto: AdminOrderQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.listBalanceDue(queryDto);
  }

  @Get('orders/:orderId')
  async getOrder(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.getOrder(orderId);
  }

  @Patch('orders/:orderId/price')
  async updateOrderPrice(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderPriceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.updateOrderPrice(orderId, dto, req.user?.userId);
  }

  @Patch('orders/:orderId/review')
  async reviewOrder(
    @Param('orderId') orderId: string,
    @Body() dto: ReviewOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.reviewOrder(orderId, dto, req.user?.userId);
  }

  @Patch('orders/:orderId/manual-payment')
  async confirmManualPayment(
    @Param('orderId') orderId: string,
    @Body() dto: ConfirmManualPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.confirmManualPayment(
      orderId,
      dto,
      req.user?.userId,
    );
  }

  @Post('orders/:orderId/approve')
  async approveOrder(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.approveOrder(orderId, req.user?.userId);
  }

  @Post('orders/:orderId/balance-reminder')
  async sendBalanceReminder(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.adminService.sendBalanceReminder(orderId, req.user?.userId);
  }

  private assertAdmin(req: AuthenticatedRequest): void {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Only admin users can access order ops.');
    }
  }
}
