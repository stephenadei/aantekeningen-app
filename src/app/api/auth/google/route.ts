import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { createLoginAudit } from '@/lib/firestore';
import { getClientIP, getUserAgent } from '@/lib/security';
import app from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    // Verify the Google ID token using Firebase Admin SDK
    const auth = getAuth(app);
    console.log('🔐 Google auth route: Verifying ID token...');
    
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
      console.log('✅ ID token verified successfully');
      console.log('   Email:', decodedToken.email);
      console.log('   UID:', decodedToken.uid);
    } catch (verifyError) {
      console.error('❌ Failed to verify ID token:', verifyError);
      throw verifyError;
    }
    
    // Check if user's email is from the allowed domain
    const email = decodedToken.email;
    console.log('🔍 Checking email domain:', email);
    
    if (!email?.endsWith('@stephensprivelessen.nl')) {
      console.warn('❌ Email domain not allowed:', email);
      // Log failed attempt - unauthorized domain
      try {
        await createLoginAudit({
          who: `teacher:${email}`,
          action: 'login_fail',
          ip: getClientIP(request),
          userAgent: getUserAgent(request),
          metadata: {
            provider: 'google',
            error: 'Unauthorized domain',
            uid: decodedToken.uid,
          },
        });
      } catch (auditError) {
        console.error('Failed to log sign-in attempt:', auditError);
      }
      
      return NextResponse.json(
        { error: 'Access denied - unauthorized domain' },
        { status: 403 }
      );
    }

    console.log('✅ Email domain is allowed');
    
    // Create a custom token for the session
    console.log('🔐 Creating custom token...');
    const customToken = await auth.createCustomToken(decodedToken.uid);
    console.log('✅ Custom token created');

    // Log successful sign-in
    await createLoginAudit({
      who: `teacher:${email}`,
      action: 'login_ok',
      ip: getClientIP(request),
      userAgent: getUserAgent(request),
      metadata: {
        provider: 'google',
        email: email,
        uid: decodedToken.uid,
      },
    });

    // Set the token as a secure HTTP-only cookie
    const response = NextResponse.json({ 
      success: true, 
      user: {
        uid: decodedToken.uid,
        email: email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      }
    });

    response.cookies.set('firebase-token', customToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    console.log('✅ Login successful for:', email);
    return response;

  } catch (error) {
    console.error('❌ Google sign-in failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }

    // Log failed attempt
    try {
      await createLoginAudit({
        who: 'teacher:unknown',
        action: 'login_fail',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: {
          provider: 'google',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (auditError) {
      console.error('Failed to log sign-in attempt:', auditError);
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

