// Firebase Admin is deprecated and removed.
// Please use Prisma for database operations.

export const db = new Proxy({}, {
  get: () => {
    throw new Error('Firestore has been removed from this project. Please use Prisma (PostgreSQL) instead.');
  }
}) as any;

export const auth = new Proxy({}, {
  get: () => {
    throw new Error('Firebase Auth has been removed. Please use NextAuth.');
  }
}) as any;
