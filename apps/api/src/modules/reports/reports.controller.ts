import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a report for a test run' })
  async generate(
    @Body() dto: GenerateReportDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.reportsService.generate(dto, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all reports' })
  async findAll() {
    return this.reportsService.findAll();
  }
}
