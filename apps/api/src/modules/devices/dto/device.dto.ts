import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsIP,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'Tab-A8-001' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['android', 'windows', 'browser'] })
  @IsIn(['android', 'windows', 'browser'])
  platform: string;

  @ApiPropertyOptional({ example: '14' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: 'Samsung Galaxy Tab A8' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'R52N12345' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: '192.168.1.50' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  capabilities?: Record<string, unknown>;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'Tab-A8-001-renamed' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  capabilities?: Record<string, unknown>;
}

export class HeartbeatDto {
  @ApiProperty({ enum: ['online', 'offline', 'busy', 'error'] })
  @IsIn(['online', 'offline', 'busy', 'error'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metrics?: Record<string, unknown>;
}
