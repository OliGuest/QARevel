import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../../../.env') });

import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'qarevel',
  password: process.env.DB_PASSWORD || 'qarevel',
  database: process.env.DB_DATABASE || 'qarevel',
  entities: [path.join(__dirname, 'entities', '*.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  logging: process.env.DB_LOGGING === 'true',
});
