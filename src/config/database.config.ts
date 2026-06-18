import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds the TypeORM connection options from environment variables.
 * Entities are auto-loaded so each feature module registers its own.
 *
 * Two ways to configure the connection:
 *   1. DATABASE_URL — a single `postgres://user:pass@host:5432/db` string. This
 *      is what managed hosts hand you (Fly.io `postgres attach`, Render, Neon,
 *      Railway, Supabase). Takes priority when present.
 *   2. DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_DATABASE — discrete
 *      vars, used for local development.
 *
 * Set DB_SSL=true for providers that require TLS (Neon, Supabase, Render's
 * external host). Fly.io's private network does not need it, so leave it unset.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  // `synchronize` keeps the schema in sync with the entities automatically.
  // Convenient for development; disable it (run migrations) in production.
  const synchronize = config.get<string>('DB_SYNCHRONIZE', 'true') === 'true';
  const ssl =
    config.get<string>('DB_SSL') === 'true'
      ? { rejectUnauthorized: false }
      : false;

  const url = config.get<string>('DATABASE_URL');
  if (url) {
    return { type: 'postgres', url, autoLoadEntities: true, synchronize, ssl };
  }

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_DATABASE', 'hpd_booking'),
    autoLoadEntities: true,
    synchronize,
    ssl,
  };
}
