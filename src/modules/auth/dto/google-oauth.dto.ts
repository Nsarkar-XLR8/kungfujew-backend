import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for initiating Google OAuth flow
 */
export class GoogleOAuthInitDto {
  @ApiPropertyOptional({
    description:
      'Frontend URL to redirect to after a successful browser OAuth callback.',
    example: 'https://app.kungfujew.com/dashboard',
  })
  @IsOptional()
  @IsUrl()
  @IsString()
  redirectUrl?: string;
}

/**
 * DTO for Google OAuth callback
 */
export class GoogleOAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code returned by Google.',
    example: '4/0Adeu5BV_example_code',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'State value returned by Google and validated against Redis.',
    example: 'c0b6e7d53a9f4f4c9d8f6c0f8c7d4b2a',
  })
  @IsString()
  state: string;
}
