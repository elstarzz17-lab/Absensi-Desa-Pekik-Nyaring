import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get current date in WIB
    const now = new Date();
    const wibOffset = 7 * 60;
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const wibNow = new Date(utcTime + wibOffset * 60000);

    // Today's date range (start and end of day in WIB)
    const todayStart = new Date(wibNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(wibNow);
    todayEnd.setHours(23, 59, 59, 999);

    // Total perangkat counts
    const totalPerangkat = await db.perangkatDesa.count();
    const totalAktif = await db.perangkatDesa.count({
      where: { status: 'AKTIF' },
    });
    const totalPasif = await db.perangkatDesa.count({
      where: { status: 'PASIF' },
    });

    // Hadir hari ini (unique perangkat with DATANG today)
    const datangHariIni = await db.absensi.findMany({
      where: {
        tipe: 'DATANG',
        tanggal: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { perangkatDesaId: true },
      distinct: ['perangkatDesaId'],
    });
    const hadirHariIni = datangHariIni.length;

    // Pulang hari ini (unique perangkat with PULANG today)
    const pulangHariIniRecords = await db.absensi.findMany({
      where: {
        tipe: 'PULANG',
        tanggal: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { perangkatDesaId: true },
      distinct: ['perangkatDesaId'],
    });
    const pulangHariIni = pulangHariIniRecords.length;

    // Persentase kehadiran
    const persentaseKehadiran = totalPerangkat > 0
      ? Math.round((hadirHariIni / totalPerangkat) * 100 * 100) / 100
      : 0;

    // Rekap 30 hari - for each perangkat, count hadir and pulang
    const thirtyDaysAgo = new Date(wibNow);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const perangkatList = await db.perangkatDesa.findMany({
      orderBy: { nipd: 'asc' },
    });

    const rekap30Hari = await Promise.all(
      perangkatList.map(async (p) => {
        const hadir = await db.absensi.count({
          where: {
            perangkatDesaId: p.id,
            tipe: 'DATANG',
            tanggal: {
              gte: thirtyDaysAgo,
              lte: todayEnd,
            },
          },
        });

        const pulang = await db.absensi.count({
          where: {
            perangkatDesaId: p.id,
            tipe: 'PULANG',
            tanggal: {
              gte: thirtyDaysAgo,
              lte: todayEnd,
            },
          },
        });

        return {
          id: p.id,
          nipd: p.nipd,
          namaLengkap: p.namaLengkap,
          jabatan: p.jabatan,
          status: p.status,
          hadir,
          pulang,
        };
      })
    );

    // Tren 7 hari - for each of last 7 days, count hadir
    const tren7Hari: { tanggal: string; hari: string; hadir: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(wibNow);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const hadirCount = await db.absensi.findMany({
        where: {
          tipe: 'DATANG',
          tanggal: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: { perangkatDesaId: true },
        distinct: ['perangkatDesaId'],
      });

      tren7Hari.push({
        tanggal: dayStart.toISOString().split('T')[0],
        hari: dayStart.toLocaleDateString('id-ID', { weekday: 'short' }),
        hadir: hadirCount.length,
      });
    }

    // Aktivitas terbaru - last 5 absensi with perangkat relation
    const aktivitasTerbaru = await db.absensi.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        perangkatDesa: true,
      },
    });

    // Today's absensi list (for real-time display)
    const absensiHariIni = await db.absensi.findMany({
      where: {
        tanggal: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        perangkatDesa: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalPerangkat,
        totalAktif,
        totalPasif,
        hadirHariIni,
        pulangHariIni,
        persentaseKehadiran,
        rekap30Hari,
        tren7Hari,
        aktivitasTerbaru,
        absensiHariIni,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
