import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LogEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testRunId?: string;

  @ApiProperty()
  @IsString()
  correlationId: string;

  @ApiProperty({ enum: ['app', 'device', 'automation', 'proxy', 'agent'] })
  @IsIn(['app', 'device', 'automation', 'proxy', 'agent'])
  source: string;

  @ApiProperty({ enum: ['debug', 'info', 'warn', 'error', 'fatal'] })
  @IsIn(['debug', 'info', 'warn', 'error', 'fatal'])
  level: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class BatchLogDto {
  @ApiProperty({ type: [LogEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogEntryDto)
  entries: LogEntryDto[];
}
