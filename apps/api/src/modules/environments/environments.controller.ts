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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto, UpdateEnvironmentDto } from './dto/environment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Environments')
@ApiBearerAuth()
@Controller('environments')
@UseGuards(JwtAuthGuard)
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all environments' })
  async findAll() {
    return this.environmentsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new environment' })
  async create(
    @Body() dto: CreateEnvironmentDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.environmentsService.create(dto, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an environment' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.environmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate an environment' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.environmentsService.delete(id);
    return { message: 'Environment deactivated' };
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Run health check on environment' })
  async healthCheck(@Param('id', ParseUUIDPipe) id: string) {
    return this.environmentsService.healthCheck(id);
  }
}
