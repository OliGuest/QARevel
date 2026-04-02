import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Client as MinioClient } from 'minio';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'qarevel';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'qarevel123';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'qarevel';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  private readonly minioClient: MinioClient;

  constructor() {
    this.minioClient = new MinioClient({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: false,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
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
      const stream = await this.minioClient.getObject(MINIO_BUCKET, key);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      stream.pipe(res);
    } catch {
      throw new NotFoundException(`Screenshot not found: ${key}`);
    }
  }
}
