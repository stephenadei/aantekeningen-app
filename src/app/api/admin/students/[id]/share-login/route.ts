import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { config, ensureConfigValidated } from '@/lib/config';
import bcrypt from 'bcrypt';

/**
 * GET /api/admin/students/[id]/share-login
 * Get shareable login information for a student
 * Note: This endpoint does NOT return the actual PIN, only generates share messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pinHash: true,
        datalakePath: true,
        shareToken: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!student.pinHash) {
      return NextResponse.json(
        { error: 'PIN not set for this student' },
        { status: 400 }
      );
    }

    // Get base URL
    ensureConfigValidated();
    const baseUrl = config.baseUrl;
    const studentPortalUrl = `${baseUrl}/leerling`;
    const shareUrl = student.shareToken 
      ? `${baseUrl}/share/${student.shareToken}`
      : `${baseUrl}/student/${student.datalakePath || student.id}`;

    // Generate share messages (without actual PIN - admin must provide it)
    const whatsappMessage = `Hoi ${student.name}! 👋

Dit is je toegang tot je bijlesnotities van Stephen's Privelessen:

📒 Link: ${studentPortalUrl}
🔗 Directe link: ${shareUrl}

Je hebt je PIN nodig om in te loggen. 📚`;

    const emailSubject = `Toegang tot je bijlesnotities - ${student.name}`;
    const emailBody = `Beste ${student.name},

Hier is je toegang tot je bijlesnotities van Stephen's Privelessen:

🔗 Link: ${studentPortalUrl}
🔗 Directe link: ${shareUrl}

Je hebt je PIN nodig om in te loggen.

Met vriendelijke groet,
Stephen's Privelessen`;

    const clipboardText = `Toegang tot bijlesnotities voor ${student.name}

Link: ${studentPortalUrl}
Directe link: ${shareUrl}

PIN: [PIN moet handmatig worden toegevoegd]`;

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        hasPin: true,
      },
      shareInfo: {
        studentPortalUrl,
        shareUrl,
        whatsappMessage,
        whatsappLink: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
        emailSubject,
        emailBody,
        emailLink: `mailto:${student.email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
        clipboardText,
      },
    });

  } catch (error) {
    console.error('Error getting share login info:', error);
    return NextResponse.json(
      { error: 'Failed to get share login info' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/students/[id]/share-login
 * Get shareable login information WITH PIN (for one-time sharing)
 * This endpoint requires the admin to provide the PIN they want to share
 * Note: We cannot retrieve the actual PIN from the hash, so admin must provide it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pin } = body;

    // Admin must provide the PIN they want to share
    // We cannot retrieve the actual PIN from bcrypt hash
    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be provided and be exactly 6 digits' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        datalakePath: true,
        shareToken: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get base URL
    ensureConfigValidated();
    const baseUrl = config.baseUrl;
    const studentPortalUrl = `${baseUrl}/leerling`;
    const shareUrl = student.shareToken 
      ? `${baseUrl}/share/${student.shareToken}`
      : `${baseUrl}/student/${student.datalakePath || student.id}`;

    // Generate share messages WITH PIN
    const whatsappMessage = `Hoi ${student.name}! 👋

Dit is je toegang tot je bijlesnotities van Stephen's Privelessen:

🔑 PIN: ${pin}
📒 Link: ${studentPortalUrl}
🔗 Directe link: ${shareUrl}

Bewaar deze code veilig. Tot in de les! 📚`;

    const emailSubject = `Toegang tot je bijlesnotities - ${student.name}`;
    const emailBody = `Beste ${student.name},

Hier is je toegang tot je bijlesnotities van Stephen's Privelessen:

🔑 PIN: ${pin}
🔗 Link: ${studentPortalUrl}
🔗 Directe link: ${shareUrl}

Bewaar deze code veilig.

Met vriendelijke groet,
Stephen's Privelessen`;

    const clipboardText = `Toegang tot bijlesnotities voor ${student.name}

PIN: ${pin}
Link: ${studentPortalUrl}
Directe link: ${shareUrl}`;

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
      },
      shareInfo: {
        pin,
        studentPortalUrl,
        shareUrl,
        whatsappMessage,
        whatsappLink: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
        emailSubject,
        emailBody,
        emailLink: student.email 
          ? `mailto:${student.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
          : null,
        clipboardText,
      },
    });

  } catch (error) {
    console.error('Error getting share login info with PIN:', error);
    return NextResponse.json(
      { error: 'Failed to get share login info' },
      { status: 500 }
    );
  }
}

