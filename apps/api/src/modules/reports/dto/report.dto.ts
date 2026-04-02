import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiProperty()
  @IsUUID()
  testRunId: string;

  @ApiPropertyOptional({ enum: ['standard', 'load_test', 'comparison'], default: 'standard' })
  @IsOptional()
  @IsIn(['standard', 'load_test', 'comparison'])
  type?: string;
}
