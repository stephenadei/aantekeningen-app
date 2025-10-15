import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Check if we're in a Vercel preview/development environment
    const isVercelPreview = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';
    
    return [
      {
        source: '/(.*)',
        headers: [
          // Only add CSP in production, disable for Vercel previews to avoid feedback.js issues
          ...(isVercelPreview ? [] : [{
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
              "script-src-elem 'self' 'unsafe-inline' https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: wss: https://api.openai.com https://vercel.live",
              "frame-src 'self' https://drive.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          }])
        ]
      }
    ];
  }
};

export default nextConfig;
