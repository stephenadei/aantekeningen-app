import { NextRequest, NextResponse } from 'next/server';
import pdf2pic from 'pdf2pic';
import { datalakeService } from '@/lib/datalake-simple';
import { datalakeThumbnailService } from '@/lib/datalake-thumbnails';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; pageNumber: string }> }
) {
  let tempPdfPath: string | null = null;
  
  try {
    const { fileId, pageNumber } = await params;
    const { searchParams } = new URL(request.url);
    const size = (searchParams.get('size') || 'medium') as 'small' | 'medium' | 'large';
    const page = parseInt(pageNumber) || 1;
    
    console.log('🖼️ Generating PDF thumbnail for fileId:', fileId, 'page:', page, 'size:', size);

    // Validate fileId
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Validate page number
    if (page < 1 || page > 10) {
      return NextResponse.json(
        { error: 'Page number must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Check if thumbnail already exists in datalake (with page-specific key)
    const pageSpecificFileId = `${fileId}_page${page}`;
    try {
      const existingThumbnailUrl = await datalakeThumbnailService.getThumbnailUrl(pageSpecificFileId, size);
      if (existingThumbnailUrl) {
        console.log('✅ Thumbnail found in datalake, redirecting to:', existingThumbnailUrl);
        return NextResponse.redirect(existingThumbnailUrl, {
          headers: {
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        });
      }
    } catch {
      console.log('📭 Thumbnail not found in datalake, will generate new one');
    }

    // Validate fileId format (must be a datalake path)
    if (!fileId.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid file ID format. Expected datalake path.' },
        { status: 400 }
      );
    }

    // Get file info from datalake
    const filePath = fileId;
    const fileInfo = await datalakeService.getFileInfo(filePath);
    if (!fileInfo.success || !fileInfo.data) {
      return NextResponse.json(
        { error: 'File not found in datalake' },
        { status: 404 }
      );
    }
    
    // Check if file is a PDF
    if (!fileInfo.data.mimeType || !fileInfo.data.mimeType.includes('pdf')) {
      return NextResponse.json(
        { error: 'File is not a PDF' },
        { status: 400 }
      );
    }
    
    const downloadUrl = typeof fileInfo.data.downloadUrl === 'string' 
      ? fileInfo.data.downloadUrl 
      : String(fileInfo.data.downloadUrl);

    // Download the PDF file from datalake
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to download PDF from datalake' },
        { status: 500 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    tempPdfPath = path.join('/tmp', `temp_${fileId.replace(/\//g, '_')}_page${page}_${Date.now()}.pdf`);
    await writeFile(tempPdfPath, Buffer.from(pdfBuffer));
    
    // Configure pdf2pic based on size
    const sizeConfig = {
      small: { width: 200, height: 200 },
      medium: { width: 400, height: 400 },
      large: { width: 800, height: 800 }
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Convert specific PDF page to image
    try {
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 100,
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: config.width,
        height: config.height
      });

      const result = await convert(page, { responseType: 'base64' });
      
      if (!result || !result.base64) {
        console.error(`❌ pdf2pic returned empty result for page ${page} of ${fileId}`);
        throw new Error(`Failed to generate thumbnail: pdf2pic returned empty result`);
      }

      // Convert to image buffer
      const imageBuffer = Buffer.from(result.base64, 'base64');
      
      // Store thumbnail in datalake with page-specific key
      try {
        const datalakeUrl = await datalakeThumbnailService.storeThumbnail(pageSpecificFileId, imageBuffer, size);
        console.log('✅ Thumbnail stored in datalake:', datalakeUrl);
        
        return NextResponse.redirect(datalakeUrl, {
          headers: {
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        });
      } catch (storageError) {
        console.error('❌ Failed to store thumbnail in datalake:', storageError);
        // Fallback: return the image directly
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': imageBuffer.length.toString(),
          },
        });
      }
    } catch (convertError) {
      console.error(`❌ Error converting PDF page ${page} to image:`, convertError);
      // Check if page number might be too high
      if (convertError instanceof Error && convertError.message.includes('page')) {
        return NextResponse.json(
          { error: `Page ${page} does not exist in PDF` },
          { status: 400 }
        );
      }
      throw convertError;
    }

  } catch (error) {
    console.error('❌ Error generating PDF thumbnail:', error);
    
    // Return a fallback placeholder
    const fallbackSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f3f4f6"/>
        <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
        <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">PDF Preview</text>
        <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">Page ${pageNumber}</text>
      </svg>
    `;
    
    return new NextResponse(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } finally {
    // Clean up temporary file
    if (tempPdfPath) {
      try {
        await unlink(tempPdfPath);
      } catch (error) {
        console.error('❌ Failed to clean up temporary file:', error);
      }
    }
  }
}

