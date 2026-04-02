import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto, UpdateDeviceDto, HeartbeatDto } from './dto/device.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all devices' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('platform') platform?: string,
    @Query('status') status?: string,
  ) {
    return this.devicesService.findAll({ platform, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.findById(id);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new device' })
  async register(
    @Body() dto: RegisterDeviceDto,
    @Request() req: { user: { userId: string } },
  ) {
    const result = await this.devicesService.register(dto, req.user.userId);
    return {
      id: result.device.id,
      name: result.device.name,
      platform: result.device.platform,
      agentToken: result.agentToken,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a device' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deregister a device' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.devicesService.delete(id);
    return { message: 'Device deregistered' };
  }

  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Agent sends device heartbeat' })
  async heartbeat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HeartbeatDto,
  ) {
    return this.devicesService.heartbeat(id, dto);
  }
}
