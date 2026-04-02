import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'Local Dev' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['local', 'remote'] })
  @IsIn(['local', 'remote'])
  type: string;

  @ApiProperty({ example: 'http://192.168.1.10:3000' })
  @IsString()
  baseUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'http://192.168.1.10:3000/health' })
  @IsOptional()
  @IsString()
  healthCheckUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;
}

export class UpdateEnvironmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['local', 'remote'] })
  @IsOptional()
  @IsIn(['local', 'remote'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  healthCheckUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
