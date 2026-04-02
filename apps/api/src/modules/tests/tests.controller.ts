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
import { TestsService } from './tests.service';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
  CreateTestStepDto,
  UpdateTestStepDto,
  CreateTestSuiteDto,
  UpdateTestSuiteDto,
  AddCaseToSuiteDto,
  StartTestRunDto,
} from './dto/test.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// ── Test Cases Controller ──

@ApiTags('Test Cases')
@ApiBearerAuth()
@Controller('test-cases')
@UseGuards(JwtAuthGuard)
export class TestCasesController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  @ApiOperation({ summary: 'List all test cases' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  async findAll(
    @Query('platform') platform?: string,
    @Query('type') type?: string,
    @Query('tags') tags?: string,
  ) {
    const tagArray = tags ? tags.split(',').map((t) => t.trim()) : undefined;
    return this.testsService.findAllCases({ platform, type, tags: tagArray });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new test case' })
  async create(
    @Body() dto: CreateTestCaseDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.testsService.createCase(dto, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test case with steps' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findCaseById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a test case' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testsService.updateCase(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a test case' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.testsService.deleteCase(id);
    return { message: 'Test case deleted' };
  }

  @Post(':id/steps')
  @ApiOperation({ summary: 'Add a step to a test case' })
  async addStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTestStepDto,
  ) {
    return this.testsService.createStep(id, dto);
  }

  @Patch(':id/steps/:stepId')
  @ApiOperation({ summary: 'Update a test step' })
  async updateStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpdateTestStepDto,
  ) {
    return this.testsService.updateStep(id, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  @ApiOperation({ summary: 'Delete a test step' })
  async deleteStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    await this.testsService.deleteStep(id, stepId);
    return { message: 'Test step deleted' };
  }
}

// ── Test Suites Controller ──

@ApiTags('Test Suites')
@ApiBearerAuth()
@Controller('test-suites')
@UseGuards(JwtAuthGuard)
export class TestSuitesController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  @ApiOperation({ summary: 'List all test suites' })
  async findAll() {
    return this.testsService.findAllSuites();
  }

  @Post()
  @ApiOperation({ summary: 'Create a test suite' })
  async create(
    @Body() dto: CreateTestSuiteDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.testsService.createSuite(dto, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test suite with cases' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findSuiteById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a test suite' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestSuiteDto,
  ) {
    return this.testsService.updateSuite(id, dto);
  }

  @Post(':id/cases')
  @ApiOperation({ summary: 'Add a test case to the suite' })
  async addCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCaseToSuiteDto,
  ) {
    return this.testsService.addCaseToSuite(id, dto.testCaseId);
  }

  @Delete(':id/cases/:caseId')
  @ApiOperation({ summary: 'Remove a test case from the suite' })
  async removeCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    await this.testsService.removeCaseFromSuite(id, caseId);
    return { message: 'Case removed from suite' };
  }
}

// ── Test Runs Controller ──

@ApiTags('Test Runs')
@ApiBearerAuth()
@Controller('test-runs')
@UseGuards(JwtAuthGuard)
export class TestRunsController {
  constructor(private readonly testsService: TestsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new test run' })
  async start(
    @Body() dto: StartTestRunDto,
    @Request() req: { user: { userId: string } },
  ) {
    const run = await this.testsService.startRun(dto, req.user.userId);
    return {
      id: run.id,
      correlationId: run.correlationId,
      status: run.status,
      wsChannel: `test-run:${run.id}`,
    };
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop/cancel a running test' })
  async stop(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.stopRun(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test run details' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findRunById(id);
  }

  @Get()
  @ApiOperation({ summary: 'List test runs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.testsService.findAllRuns({ status, type });
  }
}
