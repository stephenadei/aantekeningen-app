import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import { validateTeacherEmail } from './security';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: process.env.ALLOWED_TEACHER_DOMAIN || 'stephensprivelessen.nl',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only allow sign-ins from the allowed domain
      if (!user.email || !validateTeacherEmail(user.email)) {
        console.log(`Sign-in rejected for email: ${user.email}`);
        return false;
      }
      
      // Log successful sign-in attempt
      try {
        await prisma.loginAudit.create({
          data: {
            who: `teacher:${user.email}`,
            action: 'login_attempt',
            metadata: {
              provider: account?.provider,
              email: user.email,
            },
          },
        });
      } catch (error) {
        console.error('Failed to log sign-in attempt:', error);
      }
      
      return true;
    },
    async session({ session, user }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login?error=AccessDenied',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log successful sign-in
      try {
        await prisma.loginAudit.create({
          data: {
            who: `teacher:${user.email}`,
            action: 'login_ok',
            metadata: {
              provider: account?.provider,
              isNewUser,
              email: user.email,
            },
          },
        });
      } catch (error) {
        console.error('Failed to log successful sign-in:', error);
      }
    },
    async signOut({ session }) {
      // Log sign-out
      if (session?.user?.email) {
        try {
          await prisma.loginAudit.create({
            data: {
              who: `teacher:${session.user.email}`,
              action: 'logout',
            },
          });
        } catch (error) {
          console.error('Failed to log sign-out:', error);
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
