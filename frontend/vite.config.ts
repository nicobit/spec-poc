import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('react-monaco-editor') || id.includes('monaco-editor')) {
            return 'vendor-monaco';
          }

          if (id.includes('mermaid') || id.includes('katex')) {
            return 'vendor-mermaid';
          }

          if (id.includes('reactflow') || id.includes('@xyflow') || id.includes('cytoscape')) {
            return 'vendor-diagrams';
          }

          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }

          if (id.includes('@azure/msal')) {
            return 'vendor-auth';
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    open: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
