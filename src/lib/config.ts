/**
 * App configuration and URLs
 */

export const APP_CONFIG = {
  // Production domain
  PRODUCTION_DOMAIN: 'stephensprive.app',
  
  // App URLs
  get BASE_URL() {
    // Use environment variable if available, otherwise use production domain
    return process.env.NEXT_PUBLIC_APP_URL || 
           process.env.NEXTAUTH_URL || 
           `https://${this.PRODUCTION_DOMAIN}`;
  },
  
  get STUDENT_PORTAL_URL() {
    return `${this.BASE_URL}/leerling`;
  },
  
  get ADMIN_PORTAL_URL() {
    return `${this.BASE_URL}/admin`;
  },
  
  // App metadata
  APP_NAME: 'Aantekeningen App',
  APP_DESCRIPTION: 'Beveiligde bijlesnotities voor Stephen\'s Privelessen',
  
  // Contact info
  CONTACT_EMAIL: 'lessons@stephensprivelessen.nl',
  TEACHER_NAME: 'Stephen',
  
  // Features
  FEATURES: {
    PIN_LENGTH: 6,
    SESSION_DURATION_MINUTES: 30,
    MAX_NOTES_PER_STUDENT: 100,
  }
};

/**
 * Get the appropriate base URL for the current environment
 */
export function getBaseUrl(): string {
  return APP_CONFIG.BASE_URL;
}

/**
 * Get student portal URL
 */
export function getStudentPortalUrl(): string {
  return APP_CONFIG.STUDENT_PORTAL_URL;
}

/**
 * Get admin portal URL
 */
export function getAdminPortalUrl(): string {
  return APP_CONFIG.ADMIN_PORTAL_URL;
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' && 
         (APP_CONFIG.BASE_URL.includes(APP_CONFIG.PRODUCTION_DOMAIN));
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    baseUrl: APP_CONFIG.BASE_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    isProduction: isProduction(),
  };
}
