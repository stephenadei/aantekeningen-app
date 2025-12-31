/**
 * Custom error classes and error handling utilities
 * 
 * These provide structured error handling with user-friendly messages
 * and suggestions for resolution.
 */

/**
 * Base class for all application-specific errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly suggestions: string[];
  public readonly documentationUrl?: string;

  constructor(
    message: string,
    code: string,
    suggestions: string[] = [],
    documentationUrl?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.suggestions = suggestions;
    this.documentationUrl = documentationUrl;
  }
}

/**
 * Error thrown when a student ID is invalid or not found
 */
export class InvalidStudentIdError extends AppError {
  constructor(id: string, idType?: string) {
    const suggestions = [
      'Check if the student ID is correct',
      'Verify the student exists in the database',
      'If using a Drive folder ID, make sure to set idType=drive',
      'Run `node scripts/validate-student-id.mjs <id>` to check the ID'
    ];

    super(
      `Invalid student ID: ${id}${idType ? ` (type: ${idType})` : ''}`,
      'INVALID_STUDENT_ID',
      suggestions,
      '/docs/authentication.md#student-ids'
    );
  }
}

/**
 * Error thrown when a Drive folder ID is invalid or not found
 */
export class InvalidDriveFolderIdError extends AppError {
  constructor(folderId: string) {
    const suggestions = [
      'Check if the Drive folder ID is correct',
      'Verify the folder exists in Google Drive',
      'Make sure you have access to the folder',
      'Run `node scripts/validate-student-id.mjs <id>` to check the ID'
    ];

    super(
      `Invalid Drive folder ID: ${folderId}`,
      'INVALID_DRIVE_FOLDER_ID',
      suggestions,
      '/docs/authentication.md#google-drive-api'
    );
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(service: string, details: string) {
    const suggestions = [
      'Check your environment variables',
      'Run `node scripts/check-credentials.mjs` to verify your setup',
      'See AUTHENTICATION.md for detailed setup instructions'
    ];

    if (service === 'database') {
      suggestions.push('Make sure DATABASE_URL is set correctly');
    } else if (service === 'google-drive') {
      suggestions.push('Run `node scripts/refresh-oauth-token.mjs` to get a new refresh token');
    }

    super(
      `Authentication failed for ${service}: ${details}`,
      'AUTHENTICATION_ERROR',
      suggestions,
      '/docs/authentication.md'
    );
  }
}

/**
 * Error thrown when database credentials are missing or invalid
 */
export class DatabaseCredentialsError extends AppError {
  constructor(missingVars: string[]) {
    const suggestions = [
      'Add the missing environment variables to your .env.local file',
      'Check your database connection string',
      'See AUTHENTICATION.md for detailed setup instructions'
    ];

    super(
      `Missing database credentials: ${missingVars.join(', ')}`,
      'DATABASE_CREDENTIALS_ERROR',
      suggestions,
      '/docs/authentication.md#database-authentication'
    );
  }
}

/**
 * Error thrown when Google OAuth credentials are missing or invalid
 */
export class GoogleOAuthError extends AppError {
  constructor(details: string) {
    const suggestions = [
      'Check your Google OAuth environment variables',
      'Run `node scripts/refresh-oauth-token.mjs` to get a new refresh token',
      'Verify your OAuth client is configured correctly in Google Cloud Console'
    ];

    super(
      `Google OAuth error: ${details}`,
      'GOOGLE_OAUTH_ERROR',
      suggestions,
      '/docs/authentication.md#google-drive-api-authentication'
    );
  }
}

/**
 * Helper function to create a standardized error response for API routes
 */
export function createErrorResponse(error: AppError, statusCode: number = 500) {
  return {
    success: false,
    error: error.code,
    message: error.message,
    suggestions: error.suggestions,
    documentationUrl: error.documentationUrl
  };
}

/**
 * Helper function to handle unknown errors and convert them to AppError
 */
export function handleUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('invalid_grant') || error.message.includes('invalid_rapt')) {
      return new GoogleOAuthError('Refresh token expired or invalid');
    }

    if (error.message.includes('Could not load the default credentials')) {
      return new DatabaseCredentialsError(['DATABASE_URL']);
    }

    if (error.message.includes('Project not found') || error.message.includes('database')) {
      return new DatabaseCredentialsError(['DATABASE_URL']);
    }

    // Generic error
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      ['Check the logs for more details', 'See AUTHENTICATION.md for troubleshooting']
    );
  }

  // Fallback for non-Error objects
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    ['Check the logs for more details', 'See AUTHENTICATION.md for troubleshooting']
  );
}
