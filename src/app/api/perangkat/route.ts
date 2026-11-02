import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'node:crypto';

function getBirthDate(body: Record<string, unknown>) {
  const birthPlaceDate = String(body.tempatTanggalLahir ?? '');
  const match = birthPlaceDate.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?!\d)/);
  if (match) {
    const [, dayText, monthText, yearText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
  }

  const nik = String(body.nik ?? '').replace(/\D/g, '');
  if (nik.length !== 16) return null;

  const encodedDay = Number(nik.slice(6, 8));
  const day = encodedDay > 40 ? encodedDay - 40 : encodedDay;
  const month = Number(nik.slice(8, 10));
  const shortYear = Number(nik.slice(10, 12));
  const currentYear = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date())
  );
  const year = shortYear <= currentYear % 100 ? 2000 + shortYear : 1900 + shortYear;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function generateNipd(body: Record<string, unknown>, name: string) {
  const birthDate = getBirthDate(body);
  if (!birthDate) {
    throw new Error('Tanggal lahir yang valid diperlukan; isi tempat/tanggal lahir atau NIK.');
  }

  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = new Date(Date.UTC(
    Number(todayParts.find(part => part.type === 'year')?.value),
    Number(todayParts.find(part => part.type === 'month')?.value) - 1,
    Number(todayParts.find(part => part.type === 'day')?.value)
  ));
  if (birthDate > today) {
    throw new Error('Tanggal lahir tidak boleh melebihi tanggal hari ini.');
  }

  const parts = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [];
  const nameCode = parts.slice(0, 3).map(part => Array.from(part)[0].toUpperCase()).join('');
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age--;

  const dob = `${String(birthDate.getUTCDate()).padStart(2, '0')}${String(
    birthDate.getUTCMonth() + 1
  ).padStart(2, '0')}${birthDate.getUTCFullYear()}`;
  return `NIPD-${nameCode}-${age}@${dob}-${randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export async function GET() {
  try {
    const perangkatList = await db.perangkatDesa.findMany({
      orderBy: { nipd: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: perangkatList,
    });
  } catch (error) {
    console.error('Get perangkat error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      namaLengkap,
      nik,
      tempatTanggalLahir,
      jenisKelamin,
      pendidikanTerakhir,
      nomorSK,
      jabatan,
      kecamatan,
      desa,
      status,
      keterangan,
    } = body;

    if (!namaLengkap || !jabatan) {
      return NextResponse.json(
        { success: false, message: 'Nama lengkap dan jabatan wajib diisi' },
        { status: 400 }
      );
    }

    let nipd: string;
    try {
      nipd = generateNipd(body, namaLengkap);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : 'Tanggal lahir tidak valid' },
        { status: 400 },
      );
    }

    const perangkat = await db.perangkatDesa.create({
      data: {
        nipd,
        namaLengkap,
        nik: nik || null,
        tempatTanggalLahir: tempatTanggalLahir || null,
        jenisKelamin: jenisKelamin || null,
        pendidikanTerakhir: pendidikanTerakhir || null,
        nomorSK: nomorSK || null,
        jabatan,
        kecamatan: kecamatan || 'Pondok Kelapa',
        desa: desa || 'Pekik Nyaring',
        status: status || 'AKTIF',
        keterangan: keterangan || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: perangkat,
    });
  } catch (error) {
    console.error('Create perangkat error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
