import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { BatchLogDto } from './dto/log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Logs')
@ApiBearerAuth()
@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('batch')
  @ApiOperation({ summary: 'Ingest a batch of log entries' })
  async batch(@Body() dto: BatchLogDto) {
    return this.logsService.ingestBatch(dto.entries);
  }

  @Get()
  @ApiOperation({ summary: 'Query log entries' })
  @ApiQuery({ name: 'correlationId', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'testRunId', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async query(
    @Query('correlationId') correlationId?: string,
    @Query('level') level?: string,
    @Query('testRunId') testRunId?: string,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.logsService.query({
      correlationId,
      level,
      testRunId,
      source,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
