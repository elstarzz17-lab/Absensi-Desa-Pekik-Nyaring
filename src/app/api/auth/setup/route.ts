import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Buat atau atur admin melalui perintah PHP CLI di php-api/README.md.',
    },
    { status: 409 }
  );
}
