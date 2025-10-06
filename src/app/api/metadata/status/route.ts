import { NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET() {
  try {
    const cachedMetadata = googleDriveService.getCachedMetadata();
    const isCacheValid = googleDriveService.isMetadataCacheValid();
    
    // Type assertion for cached metadata
    const metadata = cachedMetadata as { lastUpdated?: string; totalStudents?: number; totalFiles?: number } | null;
    
    return NextResponse.json({
      success: true,
      hasCachedMetadata: !!cachedMetadata,
      isCacheValid: isCacheValid,
      lastUpdated: metadata?.lastUpdated || null,
      totalStudents: metadata?.totalStudents || 0,
      totalFiles: metadata?.totalFiles || 0,
      cacheAge: metadata?.lastUpdated ? Date.now() - new Date(metadata.lastUpdated).getTime() : null
    });
  } catch (error) {
    console.error('❌ Error in metadata status endpoint:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
