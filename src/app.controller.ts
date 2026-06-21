import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Health check',
    description: 'Simple root endpoint for load balancers and uptime checks.',
  })
  @ApiOkResponse({
    description: 'Application is running.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Success',
        data: 'Hello World!',
      },
    },
  })
  @SkipThrottle() // Skip rate limiting for health check
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
