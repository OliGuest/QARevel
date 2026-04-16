import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { BatchClickEventDto, CrashEventDto, ResolveCrashDto } from './dto/event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ── Click Events ──

  @Post('clicks/batch')
  @ApiOperation({ summary: 'Ingest a batch of click events' })
  async ingestClicks(@Body() dto: BatchClickEventDto) {
    return this.eventsService.ingestClickEvents(dto.events);
  }

  @Get('clicks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query click events' })
  @ApiQuery({ name: 'correlationId', required: false })
  @ApiQuery({ name: 'testRunId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async queryClicks(
    @Query('correlationId') correlationId?: string,
    @Query('testRunId') testRunId?: string,
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.eventsService.queryClickEvents({
      correlationId,
      testRunId,
      eventType,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ── Crash Events ──

  @Post('crashes')
  @ApiOperation({ summary: 'Report a crash event' })
  async ingestCrash(@Body() dto: CrashEventDto) {
    return this.eventsService.ingestCrashEvent(dto);
  }

  @Get('crashes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query crash events' })
  @ApiQuery({ name: 'correlationId', required: false })
  @ApiQuery({ name: 'testRunId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'isResolved', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async queryCrashes(
    @Query('correlationId') correlationId?: string,
    @Query('testRunId') testRunId?: string,
    @Query('severity') severity?: string,
    @Query('isResolved') isResolved?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.eventsService.queryCrashEvents({
      correlationId,
      testRunId,
      severity,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Patch('crashes/:id/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a crash event as resolved/unresolved' })
  async resolveCrash(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveCrashDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.eventsService.resolveCrash(id, req.user.userId, dto.isResolved);
  }
}
