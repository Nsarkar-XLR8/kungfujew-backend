import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CarrierService } from './carrier.service';
import { AddCarrierDto } from './dto/add-carrier.dto';

type AuthenticatedRequest = Request & { user?: { role?: string } };

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/carriers')
@UseGuards(AuthGuard)
export class CarrierController {
  constructor(private readonly carrierService: CarrierService) {}

  @ApiOperation({ summary: 'List all active carrier contacts' })
  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    this.assertAdmin(req);
    return this.carrierService.findAll();
  }

  @ApiOperation({ summary: 'Add a carrier contact' })
  @Post()
  async add(@Body() dto: AddCarrierDto, @Req() req: AuthenticatedRequest) {
    this.assertAdmin(req);
    return this.carrierService.add(dto.email, dto.companyName, dto.phone);
  }

  @ApiOperation({ summary: 'Remove a carrier contact' })
  @ApiParam({ name: 'email', description: 'Carrier email to remove' })
  @Delete(':email')
  async remove(@Param('email') email: string, @Req() req: AuthenticatedRequest) {
    this.assertAdmin(req);
    await this.carrierService.remove(email);
    return { success: true, message: `Carrier ${email} deactivated` };
  }

  private assertAdmin(req: AuthenticatedRequest): void {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Only admin users can manage carriers');
    }
  }
}
