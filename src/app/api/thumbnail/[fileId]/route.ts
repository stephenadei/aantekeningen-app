import { NextRequest, NextResponse } from 'next/server';
import pdf2pic from 'pdf2pic';
import { googleDriveService } from '@/lib/google-drive-simple';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Import Firebase Storage service only on server-side
let firebaseStorageService: { getThumbnailUrl: (fileId: string, size?: 'small' | 'medium' | 'large') => Promise<string | null>; storeThumbnail: (fileId: string, buffer: Buffer, size?: 'small' | 'medium' | 'large') => Promise<string> } | null = null;
if (typeof window === 'undefined') {
  try {
    const { firebaseStorageService: service } = await import('@/lib/firebase-storage');
    firebaseStorageService = service;
  } catch (error) {
    console.log('⚠️ Firebase Storage not available:', error);
  }
}

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  let tempPdfPath: string | null = null;
  
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const size = (searchParams.get('size') || 'medium') as 'small' | 'medium' | 'large';
    
    console.log('🖼️ Generating PDF thumbnail for fileId:', fileId, 'size:', size);

    // Validate fileId
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // First, check if thumbnail already exists in Firebase Storage
    if (firebaseStorageService) {
      try {
        const existingThumbnailUrl = await firebaseStorageService.getThumbnailUrl(fileId, size);
        if (existingThumbnailUrl) {
          console.log('✅ Thumbnail found in Firebase Storage, redirecting to:', existingThumbnailUrl);
          return NextResponse.redirect(existingThumbnailUrl);
        }
      } catch {
        console.log('📭 Thumbnail not found in Firebase Storage, will generate new one');
      }
    }

    // Get file info from Google Drive to verify it's a PDF
    const driveFileId = fileId.replace('drive-file-', '');
    const fileInfo = await googleDriveService.getFileInfo(driveFileId);
    
    if (!fileInfo.success || !fileInfo.data) {
      console.log('❌ File not found or access denied:', fileId);
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    const file = fileInfo.data;
    
    // Check if file is a PDF
    if (!file.mimeType || !file.mimeType.includes('pdf')) {
      console.log('❌ File is not a PDF:', file.mimeType);
      return NextResponse.json(
        { error: 'File is not a PDF' },
        { status: 400 }
      );
    }

    // Download the PDF file to a temporary location
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      console.log('❌ Failed to download PDF:', response.status);
      return NextResponse.json(
        { error: 'Failed to download PDF' },
        { status: 500 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    tempPdfPath = path.join('/tmp', `temp_${fileId}_${Date.now()}.pdf`);
    await writeFile(tempPdfPath, Buffer.from(pdfBuffer));
    
    // Configure pdf2pic based on size
    const sizeConfig = {
      small: { width: 200, height: 200 },
      medium: { width: 400, height: 400 },
      large: { width: 800, height: 800 }
    };

    const config = sizeConfig[size as keyof typeof sizeConfig] || sizeConfig.medium;

    // Convert PDF to image
    const convert = pdf2pic.fromPath(tempPdfPath, {
      density: 100,           // DPI
      saveFilename: "page",
      savePath: "/tmp",
      format: "png",
      width: config.width,
      height: config.height
    });

    const result = await convert(1, { responseType: "base64" });
    
    if (!result || !result.base64) {
      console.log('❌ Failed to generate thumbnail');
      return NextResponse.json(
        { error: 'Failed to generate thumbnail' },
        { status: 500 }
      );
    }

    // Convert to image buffer
    const imageBuffer = Buffer.from(result.base64, 'base64');
    
    // Store thumbnail in Firebase Storage if available
    if (firebaseStorageService) {
      try {
        const firebaseUrl = await firebaseStorageService.storeThumbnail(fileId, imageBuffer, size);
        console.log('✅ Thumbnail stored in Firebase Storage:', firebaseUrl);
        
        // Redirect to the Firebase Storage URL
        return NextResponse.redirect(firebaseUrl);
      } catch (storageError) {
        console.error('❌ Failed to store thumbnail in Firebase Storage:', storageError);
      }
    }
    
    // Fallback: return the image directly
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating PDF thumbnail:', error);
    
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
