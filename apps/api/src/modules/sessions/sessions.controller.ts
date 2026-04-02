import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionsService } from './sessions.service';
import { StartSessionDto, AddStepDto, CompleteSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a manual test session' })
  async start(
    @Body() dto: StartSessionDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.sessionsService.start(dto, req.user.userId);
  }

  @Post(':runId/step')
  @ApiOperation({ summary: 'Add a step result to the session' })
  async addStep(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() dto: AddStepDto,
  ) {
    return this.sessionsService.addStep(runId, dto);
  }

  @Post(':runId/screenshot')
  @ApiOperation({ summary: 'Upload a screenshot for the session' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadScreenshot(
    @Param('runId', ParseUUIDPipe) runId: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Request() req: { user: { userId: string } },
  ) {
    // In production, this would upload to MinIO. For now, generate a storage key.
    const storageKey = `screenshots/${runId}/${uuidv4()}-${file?.originalname || 'screenshot.png'}`;

    return this.sessionsService.uploadScreenshot(
      runId,
      file?.originalname || 'screenshot.png',
      storageKey,
      file?.mimetype || 'image/png',
      file?.size || 0,
      req.user.userId,
    );
  }

  @Post(':runId/complete')
  @ApiOperation({ summary: 'Complete the manual test session' })
  async complete(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.sessionsService.complete(runId, dto);
  }
}
