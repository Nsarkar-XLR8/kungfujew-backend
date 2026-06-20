import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
  NotEquals,
} from 'class-validator';

export class CreateAuthDto {
  @ApiProperty({
    description:
      'Full name for the new account. The legacy username field is accepted as a fallback.',
    example: 'Jordan Davis',
  })
  @Transform(({ value, obj }) => value ?? obj.username)
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({
    description: 'Legacy display name field accepted as a fallback full name.',
    example: 'jordan.davis',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: 'Password with at least 8 characters.',
    example: 'StrongP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Unique email address for the account.',
    example: 'jordan@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description:
      'Requested account role. Public registration as admin is blocked by the service.',
    enum: ['customer', 'admin'],
    example: 'customer',
    default: 'customer',
  })
  @IsOptional()
  @IsString()
  @IsIn(['customer', 'admin'], {
    message: 'role must be either customer or admin',
  })
  role?: string;
}
