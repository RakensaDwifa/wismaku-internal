import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.js'],
          setupFiles: ['src/test/storage-stub.js'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.jsx'],
          setupFiles: ['src/test/setup-dom.js'],
        },
      },
    ],
  },
})
