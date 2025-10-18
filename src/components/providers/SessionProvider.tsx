'use client';

import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

export default function SessionProvider({ children }: SessionProviderProps) {
  // Firebase Auth doesn't need a provider wrapper like NextAuth
  // Authentication is handled via Firebase client SDK directly
  return <>{children}</>;
}
