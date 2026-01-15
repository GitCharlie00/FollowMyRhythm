import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/FollowMyRhythm/', // <--- IMPORTANTE: Metti qui il nome esatto del repo tra due slash
});
