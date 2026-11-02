import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nipd: string }> }
) {
  try {
    const { nipd } = await params;

    if (!nipd) {
      return NextResponse.json(
        { success: false, message: 'NIPD wajib diisi' },
        { status: 400 }
      );
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(nipd, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Return as image/png
    return new NextResponse(new Uint8Array(qrBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
