import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppTargetsService } from './app-targets.service';
import { CreateAppTargetDto, UpdateAppTargetDto } from './dto/app-target.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('App Targets')
@ApiBearerAuth()
@Controller('app-targets')
@UseGuards(JwtAuthGuard)
export class AppTargetsController {
  constructor(private readonly appTargetsService: AppTargetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all app targets' })
  async findAll() {
    return this.appTargetsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new app target' })
  async create(
    @Body() dto: CreateAppTargetDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.appTargetsService.create(dto, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an app target' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppTargetDto,
  ) {
    return this.appTargetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an app target' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.appTargetsService.delete(id);
    return { message: 'App target deleted' };
  }
}
