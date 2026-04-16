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
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an alert rule' })
  async create(
    @Body() dto: CreateAlertRuleDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.alertsService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all alert rules' })
  async findAll() {
    return this.alertsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an alert rule' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alert rule' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.delete(id);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Manually trigger evaluation of all enabled alert rules' })
  async evaluate() {
    return this.alertsService.evaluateAll();
  }
}
