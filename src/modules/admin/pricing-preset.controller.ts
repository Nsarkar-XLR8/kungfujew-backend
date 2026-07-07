import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PricingPresetService } from './pricing-preset.service';
import { UpdatePricingPresetDto } from './dto/update-pricing-preset.dto';

type AuthenticatedRequest = Request & { user?: { role?: string } };

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Not an admin' })
@Controller('admin/pricing-presets')
@UseGuards(AuthGuard)
export class PricingPresetController {
  constructor(private readonly pricingPresetService: PricingPresetService) {}

  @ApiOperation({ summary: 'List all pricing presets' })
  @Get()
  async getAll(@Req() req: AuthenticatedRequest) {
    this.assertAdmin(req);
    return this.pricingPresetService.getAll();
  }

  @ApiOperation({ summary: 'Update a pricing preset value' })
  @ApiParam({ name: 'key', description: 'Pricing preset key (e.g. OPEN_MARKUP, ENCLOSED_MARKUP)' })
  @ApiBody({ type: UpdatePricingPresetDto })
  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() body: UpdatePricingPresetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.pricingPresetService.update(key, body.value);
  }

  private assertAdmin(req: AuthenticatedRequest): void {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Only admin users can manage pricing presets');
    }
  }
}
