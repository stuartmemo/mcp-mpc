import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/sites-worker.ts',
      fileName: () => 'server/index.js',
      formats: ['es'],
    },
    minify: true,
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
})
