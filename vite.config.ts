/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 기본 포트 5180 (다른 프로젝트의 5173 과 충돌 방지). 점유 중이면 Vite 가 다음 포트를 자동 선택한다.
  server: { port: 5180 },
  preview: { port: 5180 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
