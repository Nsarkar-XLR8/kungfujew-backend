import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdatePricingPresetDto {
  @ApiProperty({ example: 500, description: 'New numeric value for the pricing preset' })
  @IsNumber()
  @IsNotEmpty()
  value: number;
}
