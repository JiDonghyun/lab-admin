import { Module } from '@nestjs/common';
import { HealthController } from './shared/presentation/health.controller';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
