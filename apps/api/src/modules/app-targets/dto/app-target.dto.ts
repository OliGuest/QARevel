import { IsString, IsOptional, IsIn, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppTargetDto {
  @ApiProperty({ example: 'POS App Android' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['android', 'windows', 'web'] })
  @IsIn(['android', 'windows', 'web'])
  platform: string;

  @ApiPropertyOptional({ example: 'com.company.pos' })
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiPropertyOptional({ example: 'C:\\Program Files\\POS\\pos.exe' })
  @IsOptional()
  @IsString()
  executablePath?: string;

  @ApiPropertyOptional({ example: 'https://{env}/pos' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateAppTargetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['android', 'windows', 'web'] })
  @IsOptional()
  @IsIn(['android', 'windows', 'web'])
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  executablePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apkStorageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
