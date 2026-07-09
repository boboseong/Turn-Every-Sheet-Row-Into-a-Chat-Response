import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // React 플러그인 import 추가

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 👇 GitHub Pages 배포를 위한 base 경로 추가
    base: './',
    
    // 👇 React 플러그인 추가
    plugins: [react()], 
    
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});