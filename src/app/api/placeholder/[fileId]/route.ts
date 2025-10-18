import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // Generate a simple SVG placeholder
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#f3f4f6"/>
        <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
        <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">PDF Document</text>
        <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">Preview niet beschikbaar</text>
        <text x="200" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">${fileId.slice(0, 8)}...</text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // 24 hours
      },
    });

  } catch (error) {
    console.error('❌ Error generating placeholder:', error);
    return new NextResponse(null, { status: 500 });
  }
}



