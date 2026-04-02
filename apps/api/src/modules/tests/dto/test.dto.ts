import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsArray,
  IsInt,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// --- Test Case DTOs ---

export class CreateTestCaseDto {
  @ApiProperty({ example: 'Login with valid credentials' })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appTargetId?: string;

  @ApiProperty({ enum: ['android', 'windows', 'web'] })
  @IsIn(['android', 'windows', 'web'])
  platform: string;

  @ApiPropertyOptional({ enum: ['critical', 'high', 'medium', 'low'], default: 'medium' })
  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  priority?: string;

  @ApiPropertyOptional({ enum: ['manual', 'automated', 'hybrid'], default: 'manual' })
  @IsOptional()
  @IsIn(['manual', 'automated', 'hybrid'])
  type?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preconditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationSec?: number;
}

export class UpdateTestCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appTargetId?: string;

  @ApiPropertyOptional({ enum: ['android', 'windows', 'web'] })
  @IsOptional()
  @IsIn(['android', 'windows', 'web'])
  platform?: string;

  @ApiPropertyOptional({ enum: ['critical', 'high', 'medium', 'low'] })
  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  priority?: string;

  @ApiPropertyOptional({ enum: ['manual', 'automated', 'hybrid'] })
  @IsOptional()
  @IsIn(['manual', 'automated', 'hybrid'])
  type?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preconditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationSec?: number;
}

// --- Test Step DTOs ---

export class CreateTestStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  stepNumber: number;

  @ApiProperty({ example: 'Click login button' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ example: 'Dashboard loads within 3s' })
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiPropertyOptional({ example: '#login-btn' })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({ enum: ['css', 'xpath', 'accessibility_id', 'id'] })
  @IsOptional()
  @IsIn(['css', 'xpath', 'accessibility_id', 'id'])
  selectorType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  inputData?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 10000 })
  @IsOptional()
  @IsInt()
  timeoutMs?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class UpdateTestStepDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  stepNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({ enum: ['css', 'xpath', 'accessibility_id', 'id'] })
  @IsOptional()
  @IsIn(['css', 'xpath', 'accessibility_id', 'id'])
  selectorType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  inputData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeoutMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

// --- Test Suite DTOs ---

export class CreateTestSuiteDto {
  @ApiProperty({ example: 'Smoke Tests' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appTargetId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTestSuiteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appTargetId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AddCaseToSuiteDto {
  @ApiProperty()
  @IsUUID()
  testCaseId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  executionOrder?: number;
}

// --- Test Run DTOs ---

export class StartTestRunDto {
  @ApiProperty({ enum: ['manual', 'automated', 'load', 'recording'] })
  @IsIn(['manual', 'automated', 'load', 'recording'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  suiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty()
  @IsUUID()
  environmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appTargetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
