import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds the TypeORM connection options from environment variables.
 * Entities are auto-loaded so each feature module registers its own.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_DATABASE', 'hpd_booking'),
    autoLoadEntities: true,
    // `synchronize` keeps the schema in sync with the entities automatically.
    // Convenient for development; disable it (run migrations) in production.
    synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
  };
}
