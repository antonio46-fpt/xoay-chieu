/**
 * Điểm khởi động. Đọc cấu hình, dựng app, mở cổng, tắt an toàn.
 *
 *   node src/server.ts
 */
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  for (const tinHieu of ['SIGINT', 'SIGTERM'] as const) {
    process.on(tinHieu, async () => {
      app.log.info(`Nhận ${tinHieu}, đang tắt máy chủ...`);
      await app.close();
      process.exit(0);
    });
  }

  await app.listen({ host: '0.0.0.0', port: config.PORT });
  app.log.info(`Xoay Chiều API đang chạy tại cổng ${config.PORT}`);
}

main().catch(loi => {
  console.error('Không khởi động được máy chủ:');
  console.error(loi instanceof Error ? loi.message : loi);
  process.exit(1);
});
