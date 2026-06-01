import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages プロジェクトページ用のベースパス
  // カスタムドメインを使う場合は base: '/' に変更すること
  base: process.env.NODE_ENV === 'production' ? '/EIDRITH/' : '/',
})
