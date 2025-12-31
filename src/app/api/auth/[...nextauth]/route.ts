import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@stephen/database';
import { compare } from 'bcrypt';
import { createLoginAudit } from '@/lib/database';
import { createIPAddress, createUserAgent } from '@/lib/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials');
          return null;
        }

        try {
          const normalizedEmail = credentials.email.trim().toLowerCase();
          console.log('[AUTH] Attempting to find user:', normalizedEmail);
          
          const user = await prisma.user.findUnique({
            where: {
              email: normalizedEmail,
            },
          });

          if (!user) {
            console.log(`[AUTH] User not found: ${credentials.email}`);
            return null;
          }

          // Temporary password check for backward compatibility
          // TODO: Implement proper password storage in User model if needed
          const passwordTrimmed = credentials.password.trim();
          const isPasswordValid = passwordTrimmed === 'admin123'; // Temporary

          if (!isPasswordValid) {
            console.log(`[AUTH] Invalid password for user: ${credentials.email}`);
            return null;
          }
          console.log(`[AUTH] Password validated for user: ${credentials.email}`);

          console.log(`[AUTH] Successfully authenticated user: ${user.email}`);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('[AUTH] Error during authentication:', error);
          if (error instanceof Error) {
            console.error('[AUTH] Error message:', error.message);
            console.error('[AUTH] Error stack:', error.stack);
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = (token.role as string) || 'ADMIN';
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  events: {
    async signIn({ user, isNewUser }) {
      // Log successful sign-in
      if (user.email) {
        try {
          await createLoginAudit({
            who: `teacher:${user.email}`,
            action: 'login_ok',
            ip: createIPAddress('unknown'),
            userAgent: createUserAgent('unknown'),
            metadata: {
              provider: 'credentials',
              email: user.email,
              isNewUser: isNewUser || false,
            },
          });
        } catch (error) {
          console.error('Failed to log sign-in:', error);
        }
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

