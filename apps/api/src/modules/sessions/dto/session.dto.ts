import { IsString, IsOptional, IsIn, IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty()
  @IsUUID()
  deviceId: string;

  @ApiProperty()
  @IsUUID()
  environmentId: string;

  @ApiProperty()
  @IsUUID()
  appTargetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testCaseId?: string;
}

export class AddStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  stepNumber: number;

  @ApiProperty({ example: 'Opened login page' })
  @IsString()
  action: string;

  @ApiProperty({ enum: ['passed', 'failed', 'skipped', 'blocked', 'error'] })
  @IsIn(['passed', 'failed', 'skipped', 'blocked', 'error'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  durationMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  testStepId?: string;
}

export class CompleteSessionDto {
  @ApiProperty({ enum: ['passed', 'failed', 'error'] })
  @IsIn(['passed', 'failed', 'error'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
