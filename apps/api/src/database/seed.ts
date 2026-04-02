import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Device } from './entities/device.entity';
import { Environment } from './entities/environment.entity';
import { AppTarget } from './entities/app-target.entity';
import { TestCase } from './entities/test-case.entity';
import { TestStep } from './entities/test-step.entity';
import { TestSuite } from './entities/test-suite.entity';
import { TestRun } from './entities/test-run.entity';
import { TestStepResult } from './entities/test-step-result.entity';
import { LogEntry } from './entities/log-entry.entity';
import { ApiTrace } from './entities/api-trace.entity';
import { ClickEvent } from './entities/click-event.entity';
import { CrashEvent } from './entities/crash-event.entity';
import { Attachment } from './entities/attachment.entity';
import { Report } from './entities/report.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'qarevel',
  password: process.env.DB_PASSWORD || 'qarevel',
  database: process.env.DB_DATABASE || 'qarevel',
  entities: [
    User,
    Device,
    Environment,
    AppTarget,
    TestCase,
    TestStep,
    TestSuite,
    TestRun,
    TestStepResult,
    LogEntry,
    ApiTrace,
    ClickEvent,
    CrashEvent,
    Attachment,
    Report,
  ],
  synchronize: true,
});

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Connected.');

  const userRepo = dataSource.getRepository(User);

  // Check if admin already exists
  const existingAdmin = await userRepo.findOne({
    where: { email: 'admin@qarevel.local' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed.');
  } else {
    const passwordHash = await bcrypt.hash('Admin123!', 12);
    const admin = userRepo.create({
      email: 'admin@qarevel.local',
      passwordHash,
      displayName: 'Admin',
      role: 'admin',
      isActive: true,
    });
    await userRepo.save(admin);
    console.log('Admin user created: admin@qarevel.local / Admin123!');
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
