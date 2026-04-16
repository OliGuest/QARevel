import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TracesService } from './traces.service';
import { BatchTraceDto } from './dto/trace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('API Traces')
@Controller('api-traces')
export class TracesController {
  constructor(private readonly tracesService: TracesService) {}

  @Post('batch')
  @ApiOperation({ summary: 'Ingest a batch of API traces' })
  async batch(@Body() dto: BatchTraceDto) {
    return this.tracesService.ingestBatch(dto.traces);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query API traces' })
  @ApiQuery({ name: 'correlationId', required: false })
  @ApiQuery({ name: 'testRunId', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'statusCode', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async query(
    @Query('correlationId') correlationId?: string,
    @Query('testRunId') testRunId?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tracesService.query({
      correlationId,
      testRunId,
      method,
      statusCode: statusCode ? parseInt(statusCode, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
