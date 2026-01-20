import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optymalizacja pakietów - tree-shaking dla ciężkich bibliotek
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },

  // Wyłącz source maps w produkcji dla szybszego buildu
  productionBrowserSourceMaps: false,

  // Optymalizacja obrazów
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Kompresja
  compress: true,
};

export default nextConfig;
