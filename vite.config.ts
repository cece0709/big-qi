import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {pwa} from './scripts/pwa.ts';
export default defineConfig({resolve:{alias:{'@yijian/locale':new URL('./src/locale',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')}},optimizeDeps:{exclude:['@yijian/locale/jsx-runtime','@yijian/locale/jsx-dev-runtime']},plugins:[react({jsxImportSource:'@yijian/locale'}),pwa()]});
