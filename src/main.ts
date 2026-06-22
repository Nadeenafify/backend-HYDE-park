import { join } from 'path';
import helmet from 'helmet';
import type { Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { MulterExceptionFilter } from './common/multer-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Sensible security response headers (CSP, HSTS, no-sniff, frameguard, …).
  app.use(helmet());

  // All routes are served under /api (matches the frontend Vite proxy).
  app.setGlobalPrefix('api');

  // Validate and transform all incoming request payloads. forbidNonWhitelisted
  // rejects unexpected fields with a 400 instead of silently stripping them.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Map multer upload-limit errors (oversize / too many files) to proper 4xx.
  app.useGlobalFilters(new MulterExceptionFilter());

  // Allow the frontend dev server to call the API directly (without the proxy).
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Serve uploaded receipts as static files at /uploads/<filename>.
  // Defence in depth: even though only image/PDF types can be stored, prevent
  // the browser from MIME-sniffing a receipt into executable content and
  // sandbox it so any embedded script can never run in our origin.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res: Response) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 API running at http://localhost:${port}/api`);
}

bootstrap();
