import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUUID,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlertRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['test_failure_streak', 'error_rate_threshold', 'environment_down', 'flaky_detected'] })
  @IsIn(['test_failure_streak', 'error_rate_threshold', 'environment_down', 'flaky_detected'])
  conditionType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  threshold: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  environmentId?: string;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
