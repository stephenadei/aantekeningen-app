/**
 * Environment Configuration Helper
 * Automatically adapts to local development and Vercel production
 */

export const config = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isVercel: !!process.env.VERCEL,
  
  // Base URLs
  get baseUrl() {
    if (this.isVercel) {
      return process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
    }
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  },
  
  // Database
  get databaseUrl() {
    if (this.isVercel) {
      return process.env.DATABASE_URL; // PostgreSQL from Vercel
    }
    return process.env.DATABASE_URL || 'file:./dev.db'; // SQLite for local
  },
  
  // OAuth Configuration
  get oauth() {
    const baseUrl = this.baseUrl;
    
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: `${baseUrl}/api/auth/callback/google`,
        // Use explicit redirect URI if provided, otherwise auto-generate
        explicitRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      },
    };
  },
  
  // Security
  get security() {
    return {
      allowedTeacherDomain: process.env.ALLOWED_TEACHER_DOMAIN || 'stephensprivelessen.nl',
      teacherEmail: process.env.TEACHER_EMAIL || 'lessons@stephensprivelessen.nl',
    };
  },
  
  // Optional features
  get features() {
    return {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        enabled: !!process.env.OPENAI_API_KEY,
      },
      cache: {
        durationHours: parseInt(process.env.CACHE_DURATION_HOURS || '24'),
      },
    };
  },
  
  // Debug information
  get debug() {
    return {
      environment: process.env.NODE_ENV,
      isVercel: this.isVercel,
      baseUrl: this.baseUrl,
      databaseType: this.databaseUrl.startsWith('file:') ? 'SQLite' : 'PostgreSQL',
      oauthRedirectUri: this.oauth.google.redirectUri,
    };
  },
};

// Validation function
export function validateConfig() {
  const errors: string[] = [];
  
  // Required for all environments
  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is required');
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET is required');
  }
  
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  // Production-specific requirements
  if (config.isProduction && !process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required in production');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration errors:', errors);
    return false;
  }
  
  console.log('✅ Configuration validated successfully');
  console.log('🔧 Environment:', config.debug);
  
  return true;
}

// Lazy validation - only validate when config is actually used
let configValidated = false;
export function ensureConfigValidated() {
  if (!configValidated) {
    configValidated = true;
    return validateConfig();
  }
  return true;
}

// Auto-validate on import (disabled to prevent early validation errors)
// if (process.env.NODE_ENV !== 'test') {
//   validateConfig();
// }