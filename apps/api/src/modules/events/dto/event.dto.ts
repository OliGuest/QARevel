import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  IsBoolean,
  IsNumber,
  IsIn,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Click Events ──

export class ClickEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testStepResultId?: string;

  @ApiProperty()
  @IsString()
  correlationId: string;

  @ApiProperty({ enum: ['tap', 'click', 'long_press', 'swipe', 'type', 'scroll', 'navigate'] })
  @IsIn(['tap', 'click', 'long_press', 'swipe', 'type', 'scroll', 'navigate'])
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetElement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  screenName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  coordinates?: { x: number; y: number };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inputValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class BatchClickEventDto {
  @ApiProperty({ type: [ClickEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClickEventDto)
  events: ClickEventDto[];
}

// ── Crash Events ──

export class CrashEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testRunId?: string;

  @ApiProperty()
  @IsString()
  correlationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ enum: ['crash', 'anr', 'error', 'warning'] })
  @IsIn(['crash', 'anr', 'error', 'warning'])
  severity: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stackTrace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  lastActions?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  lastApiCalls?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  deviceState?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  screenshotKey?: string;
}

export class ResolveCrashDto {
  @ApiProperty()
  @IsBoolean()
  isResolved: boolean;
}
