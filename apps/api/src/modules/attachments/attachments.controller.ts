import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Client as MinioClient } from 'minio';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  private readonly minioClient: MinioClient;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new MinioClient({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: false,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'qarevel'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'qarevel123'),
    });
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'qarevel');
  }

  @Get('screenshot')
  @ApiOperation({ summary: 'Stream a screenshot from storage' })
  async getScreenshot(
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    if (!key) {
      throw new NotFoundException('Missing key parameter');
    }

    try {
      const stream = await this.minioClient.getObject(this.bucket, key);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      stream.pipe(res);
    } catch {
      throw new NotFoundException(`Screenshot not found: ${key}`);
    }
  }
}
