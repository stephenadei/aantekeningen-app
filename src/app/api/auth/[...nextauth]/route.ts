import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { validateTeacherEmail } from '@/lib/security';
import { createLoginAudit } from '@/lib/firestore';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if email is from allowed domain
      if (!user.email) {
        return false;
      }

      const emailValidation = validateTeacherEmail(user.email);
      if (!emailValidation.success) {
        // Log failed attempt (IP/userAgent not available in callback)
        try {
          const { createIPAddress, createUserAgent } = await import('@/lib/types');
          await createLoginAudit({
            who: `teacher:${user.email}`,
            action: 'login_fail',
            ip: createIPAddress('unknown'),
            userAgent: createUserAgent('unknown'),
            metadata: {
              provider: 'google',
              error: 'Unauthorized domain',
            },
          });
        } catch (error) {
          console.error('Failed to log sign-in attempt:', error);
        }
        return false; // Reject sign-in, NextAuth will redirect to error page
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.email = user.email || undefined;
        token.name = user.name || undefined;
        token.picture = user.image || undefined;
        token.uid = user.id || user.email?.split('@')[0] || 'unknown';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid || token.email?.split('@')[0] || 'unknown';
        session.user.email = token.email || '';
        session.user.name = token.name || null;
        session.user.image = token.picture || null;
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
      // Log successful sign-in (IP/userAgent not available in event)
      if (user.email) {
        try {
          const { createIPAddress, createUserAgent } = await import('@/lib/types');
          await createLoginAudit({
            who: `teacher:${user.email}`,
            action: 'login_ok',
            ip: createIPAddress('unknown'),
            userAgent: createUserAgent('unknown'),
            metadata: {
              provider: 'google',
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

