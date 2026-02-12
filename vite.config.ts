import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/pro-components', '@ant-design/icons'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-ag-grid': ['ag-grid-community', 'ag-grid-react'],
          'vendor-query': ['@tanstack/react-query', 'ky', 'zustand'],
        },
      },
    },
  },
})
