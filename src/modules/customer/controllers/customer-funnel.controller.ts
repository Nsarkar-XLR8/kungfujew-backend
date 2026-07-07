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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerFunnelService } from '../services/customer-funnel.service';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { ProcessBookingDto } from '../dto/process-booking.dto';

@ApiTags('customer funnel')
@Controller('customer/funnel')
export class CustomerFunnelController {
  constructor(private readonly customerFunnelService: CustomerFunnelService) {}

  /**
   * POST /customer/funnel/quote
   * Step 1.5: Accepts location, vehicle data, calculates rates, and generates instant quote.
   */
  @ApiOperation({
    summary: 'Create an instant quote',
    description:
      'Queues live route pricing, calculates internal markups and discounts, creates an order reference, and starts the 47-minute booking timer.',
  })
  @ApiCreatedResponse({
    description:
      'Quote generated immediately, or queued when the pricing job needs more time.',
    schema: {
      examples: {
        generated: {
          summary: 'Generated quote',
          value: {
            statusCode: 201,
            message: 'Success',
            data: {
              quoteJobId: '12',
              orderId: 'CCG-7788JD',
              finalCalculatedPrice: 1250,
              instantDiscountApplied: -100,
              warningDisclaimer:
                'Do not block windows. Personal property in the vehicle is not covered by insurance.',
              uxTriggers: {
                launchWinningDiscountVideoModal: true,
                countdownDurationSeconds: 2820,
                postBookingExpectationsVideoUrl:
                  'https://cdn.carcarriergroup.com/assets/expectations.mp4',
              },
            },
          },
        },
        queued: {
          summary: 'Queued quote job',
          value: {
            statusCode: 201,
            message: 'Success',
            data: {
              quoteJobId: '12',
              status: 'queued',
              message:
                'Quote calculation is queued. Poll the quote job endpoint for the result.',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid quote request payload.' })
  @Post('quote')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createInstantQuote(@Body() createQuoteDto: CreateQuoteDto) {
    return await this.customerFunnelService.generateInstantQuote(
      createQuoteDto,
    );
  }

  @ApiOperation({
    summary: 'Get quote job status',
    description:
      'Returns the cached status and result payload for an asynchronous quote calculation job.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'BullMQ quote job ID returned by the quote endpoint.',
    example: '12',
  })
  @ApiOkResponse({
    description: 'Quote job status returned successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: {
          jobId: '12',
          status: 'completed',
          orderId: 'CCG-7788JD',
        },
      },
    },
  })
  @Get('quote-jobs/:jobId')
  @HttpCode(HttpStatus.OK)
  async getQuoteJobStatus(@Param('jobId') jobId: string) {
    return await this.customerFunnelService.getQuotationJobStatus(jobId);
  }

  /**
   * POST /customer/funnel/checkout
   * Step 1.8: Finalizes processing booking rules, payment options, and disclaimers.
   */
  @ApiOperation({
    summary: 'Process booking checkout',
    description:
      'Validates the active quote timer, applies checkout discounts, calculates deposit/full payment totals, and moves the order into booked or pending-payment state.',
  })
  @ApiOkResponse({
    description: 'Checkout processed successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: {
          orderId: 'CCG-7788JD',
          currentLifecycleStatus: 'Booked',
          checkoutAmountProcessed: 388.13,
          billingSchedules: {
            immediateChargeBasis: 388.13,
            outstandingDeferredBalance: 862.5,
            quickBooksSurchargeInjected: 13.13,
            absoluteGrandTotal: 1263.13,
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Order is already booked, closed, or payload is invalid.',
  })
  @ApiNotFoundResponse({ description: 'Order reference was not found.' })
  @ApiGoneResponse({
    description: 'The 47-minute booking discount has expired.',
  })
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
  @ApiOperation({
    summary: 'Get quote timer remaining',
    description:
      'Checks whether the 47-minute instant-discount timer is still active for an order.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Customer-facing order reference.',
    example: 'CCG-7788JD',
  })
  @ApiOkResponse({
    description: 'Timer state returned successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: {
          active: true,
          ttlSeconds: 1842,
        },
      },
    },
  })
  @Get('timer/:orderId')
  @HttpCode(HttpStatus.OK)
  async getTimerRemaining(@Param('orderId') orderId: string) {
    return await this.customerFunnelService.getTimerRemainingSeconds(orderId);
  }
}
