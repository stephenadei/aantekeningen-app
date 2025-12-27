import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
