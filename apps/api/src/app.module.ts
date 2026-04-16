import * as path from 'path';
import * as Joi from 'joi';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
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
import { TracesModule } from './modules/traces/traces.module';
import { EventsModule } from './modules/events/events.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../../.env'),
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('qarevel'),
        DB_PASSWORD: Joi.string().default('qarevel'),
        DB_DATABASE: Joi.string().default('qarevel'),
        DB_LOGGING: Joi.string().default('false'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        MINIO_ENDPOINT: Joi.string().default('localhost'),
        MINIO_PORT: Joi.number().default(9000),
        MINIO_ACCESS_KEY: Joi.string().default('qarevel'),
        MINIO_SECRET_KEY: Joi.string().default('qarevel123'),
        MINIO_BUCKET: Joi.string().default('qarevel'),
        JWT_PRIVATE_KEY_PATH: Joi.string().optional(),
        JWT_PUBLIC_KEY_PATH: Joi.string().optional(),
        CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('DB_LOGGING') === 'true',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
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
    TracesModule,
    EventsModule,
    AlertsModule,
    HealthModule,
  ],
  providers: [
    Logger,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
