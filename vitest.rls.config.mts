import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Pruebas de seguridad contra la base de datos real de Supabase (necesitan las claves en .env.local).
export default defineConfig({
  // 'server-only' solo protege dentro de Next.js; en las pruebas del servidor se sustituye por un módulo vacío.
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src'), 'server-only': path.resolve(import.meta.dirname, 'pruebas/rls/vacio.ts') } },
  test: {
    include: ['pruebas/rls/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
