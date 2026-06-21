import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Verified account email address.',
    example: 'jordan@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Account password.',
    example: 'StrongP@ssw0rd',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token issued by login or token refresh.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutDto extends RefreshTokenDto {
  @ApiProperty({
    description: 'User ID associated with the refresh token session.',
    example: '65f1c2a6e5b9a2d8a4f2c111',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class LogoutAllDto {
  @ApiProperty({
    description:
      'User ID whose active refresh-token sessions should be revoked.',
    example: '65f1c2a6e5b9a2d8a4f2c111',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
