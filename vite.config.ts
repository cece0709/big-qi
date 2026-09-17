import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {pwa} from './scripts/pwa.ts';
export default defineConfig({plugins:[react(),pwa()]});
