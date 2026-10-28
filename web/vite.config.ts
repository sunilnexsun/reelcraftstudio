import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`        → production build in dist/ — upload this folder to your web host
// `npm run build:local`  → dist-local/: open index.html by double-clicking, no server needed
//                           (code, images and fonts inlined; videos sit next to it in videos/)
// `vite build --mode artifact` → relative-path build in dist-artifact/ used for the hosted preview
export default defineConfig(({ mode }) => {
  if (mode === 'artifact') {
    return { base: './', plugins: [react(), tailwindcss()], build: { outDir: 'dist-artifact' } }
  }
  if (mode === 'offline') {
    return {
      base: './',
      plugins: [react(), tailwindcss(), viteSingleFile()],
      build: { outDir: 'dist-local', assetsInlineLimit: 100_000_000 },
    }
  }
  return { plugins: [react(), tailwindcss()], build: { outDir: 'dist' } }
})
