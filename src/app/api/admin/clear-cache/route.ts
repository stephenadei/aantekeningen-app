import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    // Clear all cache entries
    await invalidateCache('');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
