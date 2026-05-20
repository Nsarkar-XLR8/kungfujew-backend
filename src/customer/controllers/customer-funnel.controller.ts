import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CustomerFunnelService } from '../services/customer-funnel.service';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { ProcessBookingDto } from '../dto/process-booking.dto';

@Controller('customer/funnel')
export class CustomerFunnelController {
  constructor(private readonly customerFunnelService: CustomerFunnelService) {}

  /**
   * POST /customer/funnel/quote
   * Step 1.5: Accepts location, vehicle data, calculates rates, and generates instant quote.
   */
  @Post('quote')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createInstantQuote(@Body() createQuoteDto: CreateQuoteDto) {
    return await this.customerFunnelService.generateInstantQuote(
      createQuoteDto,
    );
  }

  /**
   * POST /customer/funnel/checkout
   * Step 1.8: Finalizes processing booking rules, payment options, and disclaimers.
   */
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async processBookingCheckout(@Body() processBookingDto: ProcessBookingDto) {
    return await this.customerFunnelService.processBookingCheckout(
      processBookingDto,
    );
  }

  /**
   * GET /customer/funnel/timer/:orderId
   * Real-time validation endpoint for checking remaining seconds on active casino timers.
   */
  @Get('timer/:orderId')
  @HttpCode(HttpStatus.OK)
  async getTimerRemaining(@Param('orderId') orderId: string) {
    return await this.customerFunnelService.getTimerRemainingSeconds(orderId);
  }
}
