import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`api is running on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
