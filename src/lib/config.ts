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
    return 'postgresql'; // Using PostgreSQL
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
      databaseType: 'PostgreSQL',
    };
  },
};

// Validation function
export function validateConfig() {
  const errors: string[] = [];
  
  // Required for all environments
  
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Production-specific requirements
  // (Add if needed)
  
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
