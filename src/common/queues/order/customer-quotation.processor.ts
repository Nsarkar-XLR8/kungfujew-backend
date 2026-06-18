import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../modules/redis.module';
import { CreateQuoteDto } from '../../../modules/customer/dto/create-quote.dto';
import { CustomerFunnelService } from '../../../modules/customer/services/customer-funnel.service';
import { CUSTOMER_QUOTATION_QUEUE } from '../queue.constants';

@Processor(CUSTOMER_QUOTATION_QUEUE)
export class CustomerQuotationProcessor extends WorkerHost {
  constructor(
    private readonly customerFunnelService: CustomerFunnelService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: Job<CreateQuoteDto>): Promise<unknown> {
    await this.redis.set(
      `customer:quote-job:${job.id}`,
      JSON.stringify({ status: 'processing', jobId: job.id }),
      'EX',
      60 * 60,
    );

    try {
      const result = await this.customerFunnelService.calculateAndPersistQuote(
        job.data,
      );

      await this.redis.set(
        `customer:quote-job:${job.id}`,
        JSON.stringify({ status: 'completed', jobId: job.id, result }),
        'EX',
        60 * 60,
      );

      return result;
    } catch (error) {
      await this.redis.set(
        `customer:quote-job:${job.id}`,
        JSON.stringify({
          status: 'failed',
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        }),
        'EX',
        60 * 60,
      );
      throw error;
    }
  }
}
