import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@qarevel.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ enum: ['admin', 'lead', 'tester', 'viewer'], default: 'tester' })
  @IsOptional()
  @IsIn(['admin', 'lead', 'tester', 'viewer'])
  role?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@qarevel.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ enum: ['admin', 'lead', 'tester', 'viewer'] })
  @IsOptional()
  @IsIn(['admin', 'lead', 'tester', 'viewer'])
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
