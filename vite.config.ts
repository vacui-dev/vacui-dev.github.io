import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // User/org site at vacui-dev.github.io → base is '/'
  // If this were a project site (vacui-dev.github.io/repo-name), base would be '/repo-name/'
  base: '/',
})
