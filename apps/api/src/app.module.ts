import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DevicesModule } from './modules/devices/devices.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { AppTargetsModule } from './modules/app-targets/app-targets.module';
import { TestsModule } from './modules/tests/tests.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { LogsModule } from './modules/logs/logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { RecordingsModule } from './modules/recordings/recordings.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'qarevel',
      password: process.env.DB_PASSWORD || 'qarevel',
      database: process.env.DB_DATABASE || 'qarevel',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.DB_LOGGING === 'true',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    AuthModule,
    UsersModule,
    DevicesModule,
    EnvironmentsModule,
    AppTargetsModule,
    TestsModule,
    SessionsModule,
    LogsModule,
    ReportsModule,
    GatewayModule,
    AttachmentsModule,
    RecordingsModule,
  ],
})
export class AppModule {}
