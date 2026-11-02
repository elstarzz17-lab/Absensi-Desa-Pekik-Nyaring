import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.perangkatDesa.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Perangkat desa tidak ditemukan' },
        { status: 404 }
      );
    }

    const perangkat = await db.perangkatDesa.update({
      where: { id },
      data: {
        namaLengkap: body.namaLengkap,
        nik: body.nik,
        tempatTanggalLahir: body.tempatTanggalLahir,
        jenisKelamin: body.jenisKelamin,
        pendidikanTerakhir: body.pendidikanTerakhir,
        nomorSK: body.nomorSK,
        jabatan: body.jabatan,
        kecamatan: body.kecamatan,
        desa: body.desa,
        status: body.status,
        keterangan: body.keterangan,
      },
    });

    return NextResponse.json({
      success: true,
      data: perangkat,
    });
  } catch (error) {
    console.error('Update perangkat error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.perangkatDesa.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Perangkat desa tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.perangkatDesa.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Perangkat desa berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete perangkat error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
