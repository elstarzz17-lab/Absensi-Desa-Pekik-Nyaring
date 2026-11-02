import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    // Date range filter
    if (from || to) {
      where.tanggal = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setUTCHours(0, 0, 0, 0);
        (where.tanggal as Record<string, unknown>).gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);
        (where.tanggal as Record<string, unknown>).lte = toDate;
      }
    }

    // Search filter - search by perangkat nama or nipd
    if (search) {
      where.perangkatDesa = {
        OR: [
          { namaLengkap: { contains: search } },
          { nipd: { contains: search } },
        ],
      };
    }

    const absensiList = await db.absensi.findMany({
      where,
      include: {
        perangkatDesa: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: absensiList,
    });
  } catch (error) {
    console.error('Get absensi error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nipd, tipe, gpsLat, gpsLng, gpsAccuracy } = body;

    if (!nipd || !tipe) {
      return NextResponse.json(
        { success: false, message: 'NIPD/NIK dan tipe wajib diisi' },
        { status: 400 }
      );
    }

    if (tipe !== 'DATANG' && tipe !== 'PULANG') {
      return NextResponse.json(
        { success: false, message: 'Tipe harus DATANG atau PULANG' },
        { status: 400 }
      );
    }

    // Look up perangkat desa by NIPD first, then by NIK if not found
    let perangkat = await db.perangkatDesa.findUnique({
      where: { nipd },
    });

    if (!perangkat) {
      // Try lookup by NIK (16 digit number)
      perangkat = await db.perangkatDesa.findFirst({
        where: { nik: nipd },
      });
    }

    if (!perangkat) {
      return NextResponse.json(
        { success: false, message: `Perangkat desa dengan NIPD/NIK "${nipd}" tidak ditemukan` },
        { status: 404 }
      );
    }

    // Get current date and time in WIB (Asia/Jakarta, UTC+7)
    const now = new Date();
    const wibOffset = 7 * 60; // 7 hours in minutes
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const wibTime = new Date(utcTime + wibOffset * 60000);

    const tanggal = wibTime;
    const waktu = wibTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Set kategori based on perangkat's status
    const kategori = perangkat.status === 'AKTIF' ? 'AKTIF' : 'PASIF';

    const absensi = await db.absensi.create({
      data: {
        perangkatDesaId: perangkat.id,
        tipe,
        kategori,
        tanggal,
        waktu,
        gpsLat: gpsLat ? String(gpsLat) : null,
        gpsLng: gpsLng ? String(gpsLng) : null,
        gpsAccuracy: gpsAccuracy ? String(gpsAccuracy) : null,
      },
      include: {
        perangkatDesa: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: absensi,
    });
  } catch (error) {
    console.error('Create absensi error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
