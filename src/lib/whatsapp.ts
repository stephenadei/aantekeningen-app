/**
 * WhatsApp sharing utilities
 */

import { getStudentPortalUrl, APP_CONFIG } from './config';

/**
 * Generate WhatsApp share link with prefilled message
 */
export function generateWhatsAppLink(studentName: string, pin: string, baseUrl?: string): string {
  const url = baseUrl || getStudentPortalUrl().replace('/leerling', '');
  const studentPortalUrl = `${url}/leerling`;
  
  const message = `Hoi ${studentName}! 👋

Dit is je toegang tot je bijlesnotities van Stephen's Privelessen:

🔑 PIN: ${pin}
📒 Link: ${studentPortalUrl}

Bewaar deze code veilig. Tot in de les! 📚`;
  
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Generate WhatsApp link for sharing student portal
 */
export function generateStudentPortalWhatsAppLink(studentName: string, baseUrl?: string): string {
  const url = baseUrl || getStudentPortalUrl().replace('/leerling', '');
  const studentPortalUrl = `${url}/leerling`;
  
  const message = `Hoi ${studentName}! 👋

Hier is de link naar je bijlesnotities van Stephen's Privelessen:

📒 ${studentPortalUrl}

Je hebt je PIN nodig om in te loggen. 📚`;
  
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Generate WhatsApp link for sharing admin portal (for other teachers)
 */
export function generateAdminPortalWhatsAppLink(baseUrl?: string): string {
  const url = baseUrl || getStudentPortalUrl().replace('/leerling', '');
  const adminUrl = `${url}/admin`;
  
  const message = `Toegang tot het docentenportaal van Stephen's Privelessen:

🔐 ${adminUrl}

Log in met je Google Workspace account (@stephensprivelessen.nl) 👨‍🏫`;
  
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Show PIN in a secure way (only once, with copy option)
 */
export function createSecurePinDisplay(pin: string, studentName: string): {
  message: string;
  whatsappLink: string;
  copyText: string;
} {
  const whatsappLink = generateWhatsAppLink(studentName, pin);
  const copyText = `PIN voor ${studentName}: ${pin}`;
  
  const message = `PIN gegenereerd voor ${studentName}:

🔑 ${pin}

⚠️ Bewaar deze PIN veilig. Deze wordt niet opnieuw getoond.

📱 Gebruik de WhatsApp knop om de PIN direct te delen!`;

  return {
    message,
    whatsappLink,
    copyText
  };
}

/**
 * Format PIN for display (with masking option)
 */
export function formatPinForDisplay(pin: string, showFull: boolean = false): string {
  if (showFull) {
    return pin;
  }
  
  // Show first 2 and last 2 digits, mask the middle
  if (pin.length >= 4) {
    return `${pin.slice(0, 2)}**${pin.slice(-2)}`;
  }
  
  return '******';
}

/**
 * Validate WhatsApp phone number format
 */
export function validateWhatsAppNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid international format (7-15 digits)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Format phone number for WhatsApp
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 0, replace with country code (assuming Netherlands +31)
  if (digits.startsWith('0')) {
    return `31${digits.slice(1)}`;
  }
  
  // If it doesn't start with country code, assume Netherlands
  if (!digits.startsWith('31')) {
    return `31${digits}`;
  }
  
  return digits;
}
