import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApiTraceDto {
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

  @ApiProperty({ enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] })
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
  method: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  requestHeaders?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  requestBody?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  statusCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  responseHeaders?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  responseBody?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  responseTimeMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  capturedAt?: string;
}

export class BatchTraceDto {
  @ApiProperty({ type: [ApiTraceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiTraceDto)
  traces: ApiTraceDto[];
}
