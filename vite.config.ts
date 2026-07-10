import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // React 플러그인 import 추가

export default defineConfig({
  // 👇 GitHub Pages 배포를 위한 base 경로 추가
  base: '/Turn-Every-Sheet-Row-Into-a-Chat-Response/',

  // 👇 React 플러그인 추가
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
