import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Załaduj .env
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'martial_arts_user',
  password: process.env.DATABASE_PASSWORD || 'dev_password_123',
  database: process.env.DATABASE_NAME || 'martial_arts_dev',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
