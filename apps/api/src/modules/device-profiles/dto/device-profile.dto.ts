import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeviceProfileDto {
  @ApiProperty({ example: 'Kiosk Landscape' })
  @IsString()
  @MaxLength(60)
  label: string;

  @ApiProperty({ enum: ['web', 'android'] })
  @IsIn(['web', 'android'])
  platform: string;

  @ApiProperty({ example: 1280 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(10000)
  width: number;

  @ApiProperty({ example: 800 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(10000)
  height: number;

  @ApiPropertyOptional({ example: 'monitor', description: 'lucide icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}
