import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'lucide-react': path.resolve(__dirname, 'src/components/icons'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'motion/react',
        'iconsax-react',
        'firebase/app',
        'firebase/auth',
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('iconsax-react')) return 'vendor-iconsax';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-core';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
