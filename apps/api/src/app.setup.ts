import type { INestApplication } from '@nestjs/common';

/** main.ts 와 e2e 테스트가 같이 쓰는 앱 공통 설정 */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
}
