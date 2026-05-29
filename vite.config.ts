import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/CALCMECH/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 3000 },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'power-screw':   ['./src/modules/powerScrew/calculations'],
          'tension-joint': ['./src/modules/tensionJoint/calculations'],
          'shear-joint':   ['./src/modules/shearJoint/calculations'],
          'vendor-charts': ['recharts'],
          'vendor-katex':  ['katex'],
          'vendor-canvas': ['html2canvas'],
        },
      },
    },
  },
  worker: { format: 'es' },
});
