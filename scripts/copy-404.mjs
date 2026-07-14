import { copyFile } from 'node:fs/promises'

await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url))
console.log('GitHub Pages SPA fallback: dist/index.html -> dist/404.html')
