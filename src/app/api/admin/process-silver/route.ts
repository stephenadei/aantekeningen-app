import { NextRequest, NextResponse } from 'next/server';
import { SilverProcessor } from '@/lib/silver-processor';

/**
 * POST /api/admin/process-silver
 * Process Bronze files into Silver layer
 * 
 * Body:
 * - subject: string (optional) - Process specific subject folder
 * - studentName: string (optional) - Process specific student
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, studentName } = body as {
      subject?: string;
      studentName?: string;
    };
    
    const processor = new SilverProcessor();
    
    if (subject && studentName) {
      // Process specific student
      const result = await processor.processStudentFolder(subject, studentName);
      return NextResponse.json({
        success: true,
        processed: result.processed,
        errors: result.errors,
      });
    } else if (subject) {
      // Process entire subject folder
      const result = await processor.processSubjectFolder(subject);
      return NextResponse.json({
        success: true,
        processed: result.processed,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'subject is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing Silver layer:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}




