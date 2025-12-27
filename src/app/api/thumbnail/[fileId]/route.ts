import { NextRequest, NextResponse } from 'next/server';
import { thumbnailGeneratorService } from '@/lib/thumbnail-generator';
import { datalakeThumbnailService } from '@/lib/datalake-thumbnails';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const size = (searchParams.get('size') || 'medium') as 'small' | 'medium' | 'large';
    
    console.log('🖼️ On-demand thumbnail request for fileId:', fileId, 'size:', size);

    // Validate fileId
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // First, check if thumbnail already exists in datalake (with better caching)
    try {
      const existingThumbnailUrl = await datalakeThumbnailService.getThumbnailUrl(fileId, size);
      if (existingThumbnailUrl) {
        console.log('✅ Thumbnail found in datalake, redirecting to:', existingThumbnailUrl);
        return NextResponse.redirect(existingThumbnailUrl, {
          headers: {
            'Cache-Control': 'public, max-age=604800, immutable', // Cache for 7 days
          },
        });
      }
    } catch (error) {
      console.log('📭 Thumbnail not found in datalake, will generate new one');
    }

    // Validate fileId format (must be a datalake path)
    if (!fileId.includes('/')) {
      console.log('⚠️ Invalid fileId format (expected datalake path):', fileId);
      return NextResponse.json(
        { error: 'Invalid file ID format. Expected datalake path.' },
        { status: 400 }
      );
    }

    // Use the thumbnail generator service for consistent generation
    const filePath = fileId;
    const result = await thumbnailGeneratorService.generateThumbnailForFile(filePath, fileId, size, false);

    if (!result.success) {
      console.error('❌ Failed to generate thumbnail:', result.error);
      
      // Return a fallback placeholder SVG
      const fallbackSvg = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#f3f4f6"/>
          <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
          <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">PDF Preview</text>
          <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">First Page</text>
        </svg>
      `;
      
      return new NextResponse(fallbackSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    }

    // Get the thumbnail URL from datalake (should exist now)
    const thumbnailUrl = await datalakeThumbnailService.getThumbnailUrl(fileId, size);
    if (thumbnailUrl) {
      console.log('✅ Thumbnail generated and stored, redirecting to:', thumbnailUrl);
      return NextResponse.redirect(thumbnailUrl, {
        headers: {
          'Cache-Control': 'public, max-age=604800, immutable', // Cache for 7 days
        },
      });
    }

    // Fallback: return error
    return NextResponse.json(
      { error: 'Failed to retrieve generated thumbnail' },
      { status: 500 }
    );

  } catch (error) {
    console.error('❌ Error in on-demand thumbnail generation:', error);
    
    // Return a fallback placeholder
    const fallbackSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f3f4f6"/>
        <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
        <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">PDF Preview</text>
        <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">First Page</text>
      </svg>
    `;
    
    return new NextResponse(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
