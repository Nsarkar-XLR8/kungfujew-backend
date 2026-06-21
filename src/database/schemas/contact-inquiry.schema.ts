import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

@Schema({ collection: 'contact_inquiries', timestamps: true })
export class ContactInquiry extends Document {
  @ApiProperty({
    description: 'Full name supplied by the person contacting support.',
    example: 'Jordan Davis',
  })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({
    description: 'Email address supplied with the inquiry.',
    example: 'jordan@example.com',
  })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    description: 'Inquiry message body.',
    example: 'I have a question about shipping an enclosed SUV.',
  })
  @Prop({ required: true })
  message: string;

  @ApiProperty({
    description: 'Inquiry creation timestamp.',
    example: '2026-06-20T10:30:00.000Z',
  })
  @Prop({ default: () => new Date() })
  createdAt: Date;

  @ApiProperty({
    description: 'Inquiry last update timestamp.',
    example: '2026-06-20T10:30:00.000Z',
  })
  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const ContactInquirySchema =
  SchemaFactory.createForClass(ContactInquiry);
