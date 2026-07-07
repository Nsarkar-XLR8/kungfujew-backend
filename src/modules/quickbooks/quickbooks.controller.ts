import { Controller, Get, Post, Query, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { QuickBooksAuthService } from './quickbooks-auth.service';

@ApiTags('quickbooks')
@Controller('quickbooks')
export class QuickBooksController {
  private readonly logger = new Logger(QuickBooksController.name);

  constructor(private readonly authService: QuickBooksAuthService) {}

  @ApiOperation({
    summary: 'Start QuickBooks OAuth2 connection flow',
  })
  @Get('connect')
  connect(@Res() res: Response) {
    const url = this.authService.getAuthorizationUrl();
    return res.redirect(url);
  }

  @ApiOperation({
    summary: 'QuickBooks OAuth2 callback handler',
  })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'realmId', required: true })
  @ApiQuery({ name: 'state', required: false })
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('realmId') realmId: string,
    @Res() res: Response,
  ) {
    const result = await this.authService.handleOAuthCallback(code, realmId);
    if (result.success) {
      return res.redirect('/admin?quickbooks=connected');
    }
    return res.redirect(`/admin?quickbooks=error&message=${encodeURIComponent(result.error || '')}`);
  }

  @ApiOperation({
    summary: 'Check QuickBooks connection status',
  })
  @Get('status')
  async status() {
    return this.authService.getConnectionStatus();
  }

  @ApiOperation({
    summary: 'Disconnect QuickBooks',
  })
  @Post('disconnect')
  async disconnect() {
    await this.authService.disconnect();
    return { success: true, message: 'QuickBooks disconnected' };
  }
}
