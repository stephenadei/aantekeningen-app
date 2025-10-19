import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable source maps in development to avoid warnings
  productionBrowserSourceMaps: false,
  
  // Disable source maps completely in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false;
    }
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
              "connect-src 'self' https: wss: https://api.openai.com https://vercel.live https://identitytoolkit.googleapis.com",
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
