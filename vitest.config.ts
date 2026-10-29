import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    // Kalıcı modül önbelleği import.meta.glob sonuçlarını dosya değişmedikçe eski hâliyle saklıyor;
    // yeni eklenen araçlar registry testinde görünmüyordu. Kapalı tutulmalı.
    fsModuleCache: false,
  },
});
