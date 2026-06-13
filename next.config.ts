import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Include pdf2pic in standalone build (needed for thumbnail generation)
  // Moved from experimental.serverComponentsExternalPackages to serverExternalPackages in Next.js 15+
  serverExternalPackages: ['pdf2pic'],
  
  // Disable source maps in development to avoid warnings
  productionBrowserSourceMaps: false,
  
  // Disable source maps completely in development
  // Also configure module resolution to prefer local node_modules
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false;
    }
    // Ensure modules resolve from project directory first
    config.resolve.modules = [
      'node_modules',
      ...(config.resolve.modules || []),
    ];
    return config;
  },
  
  // Configure image domains for Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/thumbnail**',
      },
    ],
  },
  
  // Temporarily removed turbopack.root to test if it causes the panic
  // The workspace warning is harmless - modules should resolve correctly without it
  // If module resolution issues persist, we'll need a different approach

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
              "script-src-elem 'self' 'unsafe-inline' https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: wss: https://api.openai.com https://identitytoolkit.googleapis.com",
              "frame-src 'self' https://drive.google.com https://*.firebaseapp.com https://identitytoolkit.googleapis.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
