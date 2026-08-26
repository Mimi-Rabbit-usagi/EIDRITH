import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Stockfish の JS + WASM ファイルを public/ にコピーするプラグイン */
function copyStockfishPlugin() {
  const srcDir = resolve(__dirname, 'node_modules/stockfish/bin')
  const destDir = resolve(__dirname, 'public/stockfish')
  const files = [
    'stockfish-18-lite-single.js',
    'stockfish-18-lite-single.wasm',
  ]
  function doCopy() {
    if (!existsSync(srcDir)) return
    mkdirSync(destDir, { recursive: true })
    files.forEach(f => {
      const src = `${srcDir}/${f}`
      const dst = `${destDir}/${f}`
      if (existsSync(src) && !existsSync(dst)) copyFileSync(src, dst)
    })
  }
  return {
    name: 'copy-stockfish',
    buildStart: doCopy,
    configureServer: doCopy,
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyStockfishPlugin()],
  // GitHub Pages プロジェクトページ用のベースパス
  // カスタムドメインを使う場合は base: '/' に変更すること
  base: process.env.NODE_ENV === 'production' ? '/EIDRITH/' : '/',
  server: {
    port: 5173,
    strictPort: true, // 5173が使えない場合はサイレントにポート変更せず起動失敗させる
  },
  test: {
    // React コンポーネント／フックのテストに DOM が要るため jsdom を使う
    environment: 'jsdom',
    // describe/it/expect は各テストファイルで明示的に import する（globals は使わない）
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
})
