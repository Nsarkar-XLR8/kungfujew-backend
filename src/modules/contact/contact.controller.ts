import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiPaginatedResponseDecorator } from '../../common/decorators/api-pagination.decorator';
import { ContactInquiry } from '../../database/schemas/contact-inquiry.schema';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new contact inquiry (Public)' })
  @ApiCreatedResponse({
    description: 'Inquiry submitted and admin notification queued.',
  })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @Get('all')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List all inquiries (Admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiPaginatedResponseDecorator(ContactInquiry)
  @ApiForbiddenResponse({ description: 'Only admin can view inquiries.' })
  findAll(
    @Query() queryDto: ContactQueryDto,
    @Request() req: { user: { role: string } },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admin can view contact inquiries');
    }
    return this.contactService.findAll(queryDto);
  }

  @Get(':contactId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a single inquiry (Admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'contactId',
    description: 'MongoDB ID of the inquiry.',
    example: '65f1c2a6e5b9a2d8a4f2c111',
  })
  @ApiOkResponse({
    description: 'Inquiry details returned successfully.',
    type: ContactInquiry,
  })
  @ApiForbiddenResponse({
    description: 'Only admin can view inquiry details.',
  })
  @ApiNotFoundResponse({ description: 'Inquiry was not found.' })
  findOne(
    @Param('contactId') contactId: string,
    @Request() req: { user: { role: string } },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException(
        'Only admin can view contact inquiry details',
      );
    }
    return this.contactService.findOne(contactId);
  }

  @Delete(':contactId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete an inquiry (Admin only)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'contactId',
    description: 'MongoDB ID of the inquiry.',
    example: '65f1c2a6e5b9a2d8a4f2c111',
  })
  @ApiOkResponse({ description: 'Inquiry deleted successfully.' })
  @ApiForbiddenResponse({ description: 'Only admin can delete inquiries.' })
  @ApiNotFoundResponse({ description: 'Inquiry was not found.' })
  remove(
    @Param('contactId') contactId: string,
    @Request() req: { user: { role: string } },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admin can delete contact inquiries');
    }
    return this.contactService.remove(contactId);
  }
}
