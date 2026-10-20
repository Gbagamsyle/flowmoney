import type { NestExpressApplication } from '@nestjs/platform-express';
import 'dotenv/config';
import { webOrigins } from './common/cors.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '1mb' });
  app.enableCors({
    origin: webOrigins(),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
