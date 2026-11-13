import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Pruebas de seguridad contra la base de datos real de Supabase (necesitan las claves en .env.local).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['pruebas/rls/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
