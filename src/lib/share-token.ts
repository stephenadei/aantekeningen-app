/**
 * Share Token Service
 * Generates and manages unique share tokens for students
 * Tokens are short, URL-friendly, and don't contain student names
 */

import { prisma } from './prisma';
import crypto from 'crypto';

/**
 * Generate a unique, URL-friendly share token
 * Format: 12 alphanumeric characters (lowercase + numbers)
 * Example: "a3f9k2m8p1q"
 */
function generateShareToken(): string {
  // Generate 12 random alphanumeric characters (lowercase)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < 12; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  
  return token;
}

/**
 * Get or create a share token for a student
 * Uses datalakePath to find the student, or student ID
 */
export async function getOrCreateShareToken(
  studentIdentifier: { datalakePath?: string; studentId?: string }
): Promise<{ token: string; created: boolean }> {
  try {
    // Find student by datalakePath or ID
    let student = null;
    
    if (studentIdentifier.datalakePath) {
      student = await prisma.student.findFirst({
        where: {
          datalakePath: studentIdentifier.datalakePath
        }
      });
    } else if (studentIdentifier.studentId) {
      student = await prisma.student.findUnique({
        where: {
          id: studentIdentifier.studentId
        }
      });
    }

    if (!student) {
      throw new Error('Student not found');
    }

    // If student already has a share token, return it
    if (student.shareToken) {
      return { token: student.shareToken, created: false };
    }

    // Generate a new unique token
    let token: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      token = generateShareToken();
      
      // Check if token already exists
      const existing = await prisma.student.findUnique({
        where: { shareToken: token }
      });

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique share token after multiple attempts');
    }

    // Update student with the new token
    await prisma.student.update({
      where: { id: student.id },
      data: { shareToken: token! }
    });

    return { token: token!, created: true };
  } catch (error) {
    console.error('Error getting or creating share token:', error);
    throw error;
  }
}

/**
 * Get student by share token
 */
export async function getStudentByShareToken(token: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        name: true,
        datalakePath: true,
        shareToken: true
      }
    });

    return student;
  } catch (error) {
    console.error('Error getting student by share token:', error);
    return null;
  }
}

/**
 * Regenerate share token for a student (invalidates old token)
 */
export async function regenerateShareToken(
  studentIdentifier: { datalakePath?: string; studentId?: string }
): Promise<string> {
  try {
    // Find student
    let student = null;
    
    if (studentIdentifier.datalakePath) {
      student = await prisma.student.findFirst({
        where: {
          datalakePath: studentIdentifier.datalakePath
        }
      });
    } else if (studentIdentifier.studentId) {
      student = await prisma.student.findUnique({
        where: {
          id: studentIdentifier.studentId
        }
      });
    }

    if (!student) {
      throw new Error('Student not found');
    }

    // Generate new unique token
    let token: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      token = generateShareToken();
      
      const existing = await prisma.student.findUnique({
        where: { shareToken: token }
      });

      if (!existing || existing.id === student.id) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique share token');
    }

    // Update student with new token
    await prisma.student.update({
      where: { id: student.id },
      data: { shareToken: token! }
    });

    return token!;
  } catch (error) {
    console.error('Error regenerating share token:', error);
    throw error;
  }
}


