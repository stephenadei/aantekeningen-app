import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    // TODO: Implement database PIN reset
    return NextResponse.json({ 
      id,
      pin: '000000',
      success: true, 
      message: 'PIN reset coming soon'
    });

  } catch (error) {
    console.error('Error resetting PIN:', error);
    return NextResponse.json(
      { error: 'Failed to reset PIN' },
      { status: 500 }
    );
  }
}
