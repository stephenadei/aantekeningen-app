import { NextRequest, NextResponse } from 'next/server';
import { thumbnailGeneratorService } from '@/lib/thumbnail-generator';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const student = searchParams.get('student');
    const size = (searchParams.get('size') || 'medium') as 'small' | 'medium' | 'large';
    const force = searchParams.get('force') === 'true';

    console.log('🖼️ Cron job triggered: Starting thumbnail generation...', { student, size, force });
    
    // Start thumbnail generation (don't wait for completion)
    if (student) {
      thumbnailGeneratorService.generateThumbnailsForStudent(
        student,
        size,
        force,
        (progress) => {
          console.log(`📊 Thumbnail generation progress: ${progress.processed}/${progress.total} (${progress.successful} successful, ${progress.failed} failed, ${progress.skipped} skipped)`);
        }
      ).catch(error => {
        console.error('Cron thumbnail generation failed:', error);
      });
    } else {
      thumbnailGeneratorService.generateThumbnailsForAllStudents(
        size,
        force,
        (progress) => {
          console.log(`📊 Thumbnail generation progress: ${progress.processed}/${progress.total} (${progress.successful} successful, ${progress.failed} failed, ${progress.skipped} skipped)`);
        }
      ).catch(error => {
        console.error('Cron thumbnail generation failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thumbnail generation started',
      timestamp: new Date().toISOString(),
      student: student || 'all',
      size,
      force
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



