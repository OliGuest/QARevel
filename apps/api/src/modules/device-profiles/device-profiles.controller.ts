import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceProfilesService } from './device-profiles.service';
import { CreateDeviceProfileDto } from './dto/device-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Device Profiles')
@ApiBearerAuth()
@Controller('device-profiles')
@UseGuards(JwtAuthGuard)
export class DeviceProfilesController {
  constructor(private readonly service: DeviceProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'List all device profiles' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a device profile' })
  create(
    @Body() dto: CreateDeviceProfileDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.service.create(dto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a device profile' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
    return { message: 'Device profile deleted' };
  }
}
