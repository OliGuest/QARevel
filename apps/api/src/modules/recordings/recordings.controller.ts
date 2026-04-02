import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsArray,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecordingsService } from './recordings.service';
import { EventsGateway } from '../gateway/events.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// ── DTOs ──

class StartRecordingDto {
  @IsUUID()
  environmentId: string;
}

class EventDto {
  @IsString()
  type: string;

  @IsString()
  timestamp: string;

  @IsObject()
  data: Record<string, unknown>;
}

class AddEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events: EventDto[];
}

@ApiTags('Recordings')
@Controller('recordings')
export class RecordingsController {
  constructor(
    private readonly recordingsService: RecordingsService,
    private readonly gateway: EventsGateway,
  ) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start a new recording session' })
  async startRecording(
    @Body() dto: StartRecordingDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.recordingsService.startRecording(
      dto.environmentId,
      req.user.userId,
    );
  }

  @Post(':id/stop')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Stop a recording session' })
  async stopRecording(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordingsService.stopRecording(id);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Add recording events (internal — runner)' })
  async addEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddEventsDto,
  ) {
    const count = await this.recordingsService.addEvents(id, dto.events);

    // Emit real-time stats via WebSocket
    const stats = await this.recordingsService.getEventStats(id);
    this.gateway.emitToTestRun(id, 'recording:stats', stats);

    return { inserted: count };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get recording status (internal — runner polls)' })
  async getRecordingStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordingsService.getRecordingStatus(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all recordings' })
  async listRecordings() {
    return this.recordingsService.listRecordings();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a recording by ID' })
  async getRecording(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordingsService.getRecording(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a recording' })
  async deleteRecording(@Param('id', ParseUUIDPipe) id: string) {
    await this.recordingsService.deleteRecording(id);
    return { deleted: true };
  }

  @Get(':id/events')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recording events' })
  async getRecordingEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;
    return this.recordingsService.getRecordingEvents(id, type, limit, offset);
  }
}
