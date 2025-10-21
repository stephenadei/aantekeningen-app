'use client';

import { ReactNode } from 'react';
import type { SessionProviderProps } from '@/lib/interfaces';

export default function SessionProvider({ children }: SessionProviderProps) {
  // Firebase Auth doesn't need a provider wrapper like NextAuth
  // Authentication is handled via Firebase client SDK directly
  return <>{children}</>;
}
