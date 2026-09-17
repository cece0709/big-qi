/* Copyright (c) 2026 Celia. All rights reserved. */
// Use the WebAssembly build backend for portable Windows sandbox compatibility.
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const wasm = pathToFileURL(require.resolve('esbuild-wasm')).href;
registerHooks({resolve(specifier,context,next){return specifier==='esbuild'?{url:wasm,shortCircuit:true}:next(specifier,context)}});
process.argv.push('--configLoader', 'native');
await import('../node_modules/vite/bin/vite.js');
