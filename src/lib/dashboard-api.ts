/**
 * Privelessen Dashboard API Client
 * Handles communication with privelessen-dashboard for student management
 */

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:4141';

interface DashboardStudent {
  id: string;
  name: string;
  datalakePath?: string | null;
}

interface VerifyPinResponse {
  valid: boolean;
  student?: DashboardStudent;
  error?: string;
}

/**
 * Find student by name in privelessen-dashboard
 */
export async function findStudentByName(name: string): Promise<DashboardStudent | null> {
  try {
    const encodedName = encodeURIComponent(name);
    const url = `${DASHBOARD_API_URL}/api/students/by-name/${encodedName}`;
    console.log(`🔍 Looking up student in dashboard: ${name} (URL: ${url})`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Dashboard API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`❌ Student not found in dashboard: ${name}`);
        return null;
      }
      const errorText = await response.text().catch(() => '');
      console.error(`❌ Dashboard API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Dashboard API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Student found in dashboard: ${name}`, { id: data.id, name: data.name });
    return data as DashboardStudent;
  } catch (error) {
    console.error('❌ Error finding student in dashboard:', error);
    console.error('   Dashboard URL:', DASHBOARD_API_URL);
    console.error('   Student name:', name);
    // Don't throw - return null to allow fallback
    return null;
  }
}

/**
 * Verify PIN for student login
 */
export async function verifyStudentPin(
  studentName: string,
  pin: string
): Promise<{ valid: boolean; student?: DashboardStudent; error?: string }> {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/api/students/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentName,
        pin,
      }),
    });

    const data: VerifyPinResponse = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        error: data.error || 'PIN verification failed',
      };
    }

    return {
      valid: data.valid,
      student: data.student,
      error: data.error,
    };
  } catch (error) {
    console.error('Error verifying PIN in dashboard:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if dashboard API is available
 */
export async function checkDashboardAvailability(): Promise<boolean> {
  try {
    // Use a timeout to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${DASHBOARD_API_URL}/api/students/by-name/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    // Any response (even 404) means the API is available
    return true;
  } catch (error) {
    console.warn('Dashboard API not available:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

