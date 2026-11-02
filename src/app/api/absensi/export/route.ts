import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ExcelJS from 'exceljs';

// ─── Color palette ───────────────────────────────────────────────
const CLR = {
  darkGreen:   'FF17492C',  // #17492C
  medGreen:    'FF1E6339',  // #1E6339
  lightMint:   'FFDCEFE2',  // #DCEFE2
  lightCream:  'FFF7EFD4',  // #F7EFD4
  lightPink:   'FFFDECEA',  // #FDECEA
  lightGray:   'FFE8E8E8',  // #E8E8E8
  gold:        'FFC9A227',  // #C9A227
  darkGold:    'FF7A6210',  // #7A6210
  red:         'FFC0392B',  // #C0392B
  white:       'FFFFFFFF',
  black:       'FF000000',
  darkGray:    'FF555555',  // #555555
  transparent: '00000000',
};

// ─── Helpers ─────────────────────────────────────────────────────
const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Get WIB (UTC+7) date components from a UTC Date */
function toWIB(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600000);
}

/** Format a Date to YYYY-MM-DD in WIB */
function formatDateWIB(date: Date): string {
  const w = toWIB(date);
  const y = w.getFullYear();
  const m = String(w.getMonth() + 1).padStart(2, '0');
  const d = String(w.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get number of days in a given month (0-indexed) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Check if a day (1-based) in the given month/year is weekend */
function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}

/** Get short day name for a day (1-based) in month/year */
function dayShortName(year: number, month: number, day: number): string {
  const dow = new Date(year, month, day).getDay();
  return DAY_NAMES_SHORT[dow];
}

/** Reusable thin border */
const thinBorder: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: CLR.darkGray } },
  bottom: { style: 'thin', color: { argb: CLR.darkGray } },
  left:   { style: 'thin', color: { argb: CLR.darkGray } },
  right:  { style: 'thin', color: { argb: CLR.darkGray } },
};

// ─── Main handler ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { success: false, message: 'Parameter from dan to wajib diisi (YYYY-MM-DD)' },
        { status: 400 },
      );
    }

    // ── Determine month/year from `from` date ──
    const fromDate = new Date(from + 'T00:00:00');
    const year  = fromDate.getFullYear();
    const month = fromDate.getMonth(); // 0-indexed
    const totalDays = daysInMonth(year, month);

    // ── Fetch perangkat desa ──
    const perangkatList = await db.perangkatDesa.findMany({
      orderBy: { nipd: 'asc' },
    });

    // ── Fetch absensi in date range (WIB-aware) ──
    // We query with a slightly wider UTC range to catch WIB boundary issues
    const dateFrom = new Date(from + 'T00:00:00Z');
    const dateTo   = new Date(to   + 'T23:59:59Z');
    // Shift back 7h to cover WIB→UTC offset
    dateFrom.setUTCHours(dateFrom.getUTCHours() - 7);
    dateTo.setUTCHours(dateTo.getUTCHours() + 0); // end of day already generous

    const absensiList = await db.absensi.findMany({
      where: {
        tanggal: { gte: dateFrom, lte: dateTo },
      },
      include: { perangkatDesa: true },
      orderBy: { tanggal: 'asc' },
    });

    // ── Build attendance map: key = `${nipd}|YYYY-MM-DD` → Set of tipe ──
    const attMap = new Map<string, Set<string>>();
    const absensiByDatePerson = new Map<string, typeof absensiList>();
    for (const a of absensiList) {
      const dateStr = formatDateWIB(a.tanggal);
      const key = `${a.perangkatDesa.nipd}|${dateStr}`;
      if (!attMap.has(key)) attMap.set(key, new Set());
      attMap.get(key)!.add(a.tipe);

      // Also group for Sheet 2
      const dKey = dateStr;
      if (!absensiByDatePerson.has(dKey)) absensiByDatePerson.set(dKey, []);
      absensiByDatePerson.get(dKey)!.push(a);
    }

    // ── Create workbook ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Absensi Desa Pekik Nyaring';
    workbook.created = new Date();

    // ═══════════════════════════════════════════════════════════
    // SHEET 1: Rekap Bulanan
    // ═══════════════════════════════════════════════════════════
    const ws1 = workbook.addWorksheet('Rekap Bulanan');

    // Column count: 3 (No, Nama, Jabatan) + totalDays + 3 (Hadir, Lengkap D&P, Tidak Hadir)
    const colCount = 3 + totalDays + 3;
    const dayStartCol = 4;          // 1-based
    const hadirCol    = dayStartCol + totalDays;     // 1-based
    const lengkapCol  = hadirCol + 1;
    const tidakHadirCol = lengkapCol + 1;

    // Set column widths
    ws1.getColumn(1).width = 5;   // No
    ws1.getColumn(2).width = 30;  // Nama
    ws1.getColumn(3).width = 24;  // Jabatan
    for (let d = 1; d <= totalDays; d++) {
      ws1.getColumn(dayStartCol + d - 1).width = 5;
    }
    ws1.getColumn(hadirCol).width     = 8;
    ws1.getColumn(lengkapCol).width   = 13;
    ws1.getColumn(tidakHadirCol).width = 13;

    // ── Row 1: Title ──
    const titleText = `REKAP ABSENSI PERANGKAT DESA — ${MONTH_NAMES_ID[month].toUpperCase()} ${year}`;
    ws1.mergeCells(1, 1, 1, colCount);
    const r1 = ws1.getRow(1);
    r1.height = 36;
    const c1 = ws1.getCell(1, 1);
    c1.value = titleText;
    c1.font  = { bold: true, size: 16, color: { argb: CLR.gold } };
    c1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.darkGreen } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    r1.commit();

    // ── Row 2: Subtitle ──
    const subtitleText = 'Pemerintah Desa Pekik Nyaring \u2022 Kec. Pondok Kelapa, Kab. Bengkulu Tengah';
    ws1.mergeCells(2, 1, 2, colCount);
    const r2 = ws1.getRow(2);
    r2.height = 22;
    const c2 = ws1.getCell(2, 1);
    c2.value = subtitleText;
    c2.font  = { size: 10, color: { argb: CLR.white } };
    c2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.medGreen } };
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    r2.commit();

    // ── Row 3: Legend ──
    const r3 = ws1.getRow(3);
    r3.height = 20;

    // Legend item 1: DP
    ws1.mergeCells(3, 1, 3, 3);
    const leg1 = ws1.getCell(3, 1);
    leg1.value = 'DP = Datang & Pulang';
    leg1.font  = { size: 9, bold: true, color: { argb: CLR.darkGreen } };
    leg1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightMint } };
    leg1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Legend item 2: D
    ws1.mergeCells(3, 4, 3, 7);
    const leg2 = ws1.getCell(3, 4);
    leg2.value = 'D = Hanya Datang';
    leg2.font  = { size: 9, bold: true, color: { argb: CLR.darkGold } };
    leg2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightCream } };
    leg2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Legend item 3: Kosong
    ws1.mergeCells(3, 8, 3, 11);
    const leg3 = ws1.getCell(3, 8);
    leg3.value = 'Kosong = Tidak Absen';
    leg3.font  = { size: 9, bold: true, color: { argb: CLR.red } };
    leg3.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightPink } };
    leg3.alignment = { horizontal: 'center', vertical: 'middle' };

    // Legend item 4: Abu-abu
    ws1.mergeCells(3, 12, 3, 15);
    const leg4 = ws1.getCell(3, 12);
    leg4.value = 'Abu-abu = Akhir Pekan';
    leg4.font  = { size: 9, bold: true, color: { argb: CLR.darkGray } };
    leg4.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
    leg4.alignment = { horizontal: 'center', vertical: 'middle' };

    r3.commit();

    // ── Rows 4-5: Double-row headers ──
    const r4 = ws1.getRow(4);
    const r5 = ws1.getRow(5);
    r4.height = 22;
    r5.height = 18;

    // Header style
    const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 10, color: { argb: CLR.white } };
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.darkGreen } };
    const headerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const weekendFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
    const weekendFont: Partial<ExcelJS.Font> = { bold: true, size: 9, color: { argb: CLR.darkGray } };

    // Col A: "No" (merge rows 4-5)
    ws1.mergeCells(4, 1, 5, 1);
    const hNo = ws1.getCell(4, 1);
    hNo.value = 'No';
    hNo.font = headerFont; hNo.fill = headerFill; hNo.alignment = headerAlign; hNo.border = thinBorder;

    // Col B: "Nama Perangkat Desa" (merge rows 4-5)
    ws1.mergeCells(4, 2, 5, 2);
    const hNama = ws1.getCell(4, 2);
    hNama.value = 'Nama Perangkat Desa';
    hNama.font = headerFont; hNama.fill = headerFill; hNama.alignment = headerAlign; hNama.border = thinBorder;

    // Col C: "Jabatan" (merge rows 4-5)
    ws1.mergeCells(4, 3, 5, 3);
    const hJab = ws1.getCell(4, 3);
    hJab.value = 'Jabatan';
    hJab.font = headerFont; hJab.fill = headerFill; hJab.alignment = headerAlign; hJab.border = thinBorder;

    // Day columns: row 4 = day number, row 5 = day name
    for (let d = 1; d <= totalDays; d++) {
      const col = dayStartCol + d - 1;
      const we = isWeekend(year, month, d);
      const fill = we ? weekendFill : headerFill;
      const font = we ? weekendFont : headerFont;

      const c4 = ws1.getCell(4, col);
      c4.value = d;
      c4.font = font; c4.fill = fill; c4.alignment = headerAlign; c4.border = thinBorder;

      const c5 = ws1.getCell(5, col);
      c5.value = dayShortName(year, month, d);
      c5.font = font; c5.fill = fill; c5.alignment = headerAlign; c5.border = thinBorder;
    }

    // Summary columns (merge rows 4-5)
    const summaryHeaders = [
      { col: hadirCol,     text: 'Hadir' },
      { col: lengkapCol,   text: 'Lengkap D&P' },
      { col: tidakHadirCol, text: 'Tidak Hadir' },
    ];
    for (const sh of summaryHeaders) {
      ws1.mergeCells(4, sh.col, 5, sh.col);
      const c = ws1.getCell(4, sh.col);
      c.value = sh.text;
      c.font = headerFont; c.fill = headerFill; c.alignment = headerAlign; c.border = thinBorder;
    }

    r4.commit();
    r5.commit();

    // ── Rows 6-17: Data rows (up to 12 perangkat desa) ──
    // Daily counters for the summary section
    const dailyHadirCount  = new Array(totalDays).fill(0);
    const dailyLengkapCount = new Array(totalDays).fill(0);

    for (let i = 0; i < perangkatList.length; i++) {
      const p = perangkatList[i];
      const row = ws1.getRow(6 + i);
      row.height = 20;

      // No
      const cNo = row.getCell(1);
      cNo.value = i + 1;
      cNo.alignment = { horizontal: 'center', vertical: 'middle' };
      cNo.border = thinBorder;

      // Nama
      const cNama = row.getCell(2);
      cNama.value = p.namaLengkap;
      cNama.font  = { bold: true, color: { argb: CLR.darkGreen } };
      cNama.alignment = { vertical: 'middle' };
      cNama.border = thinBorder;

      // Jabatan
      const cJab = row.getCell(3);
      cJab.value = p.jabatan;
      cJab.alignment = { vertical: 'middle' };
      cJab.border = thinBorder;

      let hadirCount = 0;
      let lengkapCount = 0;

      // Day columns
      for (let d = 1; d <= totalDays; d++) {
        const col = dayStartCol + d - 1;
        const cell = row.getCell(col);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;

        const we = isWeekend(year, month, d);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const key = `${p.nipd}|${dateStr}`;
        const types = attMap.get(key);

        if (we) {
          // Weekend: gray bg, empty value
          cell.value = '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
          cell.font = { color: { argb: CLR.darkGray } };
        } else if (types?.has('DATANG') && types?.has('PULANG')) {
          // DP: mint bg, dark green font
          cell.value = 'DP';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightMint } };
          cell.font = { bold: true, color: { argb: CLR.darkGreen } };
          hadirCount++;
          lengkapCount++;
          dailyHadirCount[d - 1]++;
          dailyLengkapCount[d - 1]++;
        } else if (types?.has('DATANG')) {
          // D only: cream bg, dark gold font
          cell.value = 'D';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightCream } };
          cell.font = { bold: true, color: { argb: CLR.darkGold } };
          hadirCount++;
          dailyHadirCount[d - 1]++;
        } else {
          // Not present: pink bg, empty
          cell.value = '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightPink } };
          cell.font = { color: { argb: CLR.red } };
        }
      }

      // Summary columns
      const workingDays = totalDays - Array.from({ length: totalDays }, (_, d) => isWeekend(year, month, d + 1) ? 1 : 0).reduce<number>((a, b) => a + b, 0);
      const tidakHadir = workingDays - hadirCount;

      const cHadir = row.getCell(hadirCol);
      cHadir.value = hadirCount;
      cHadir.alignment = { horizontal: 'center', vertical: 'middle' };
      cHadir.border = thinBorder;
      cHadir.font = { bold: true };

      const cLengkap = row.getCell(lengkapCol);
      cLengkap.value = lengkapCount;
      cLengkap.alignment = { horizontal: 'center', vertical: 'middle' };
      cLengkap.border = thinBorder;
      cLengkap.font = { bold: true };

      const cTidak = row.getCell(tidakHadirCol);
      cTidak.value = tidakHadir;
      cTidak.alignment = { horizontal: 'center', vertical: 'middle' };
      cTidak.border = thinBorder;
      cTidak.font = { bold: true, color: { argb: tidakHadir > 0 ? CLR.red : CLR.black } };

      row.commit();
    }

    // ── Row 18: Empty spacer ──
    ws1.getRow(18).height = 8;

    // ── Row 19: "REKAP KEHADIRAN PER HARI" ──
    ws1.mergeCells(19, 1, 19, colCount);
    const r19 = ws1.getRow(19);
    r19.height = 28;
    const c19 = ws1.getCell(19, 1);
    c19.value = 'REKAP KEHADIRAN PER HARI';
    c19.font  = { bold: true, size: 12, color: { argb: CLR.white } };
    c19.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.medGreen } };
    c19.alignment = { horizontal: 'center', vertical: 'middle' };
    r19.commit();

    // ── Row 20-21: Daily summary headers ──
    const r20 = ws1.getRow(20);
    const r21 = ws1.getRow(21);
    r20.height = 22;
    r21.height = 18;

    ws1.mergeCells(20, 1, 21, 1);
    const sNo = ws1.getCell(20, 1);
    sNo.value = 'No'; sNo.font = headerFont; sNo.fill = headerFill; sNo.alignment = headerAlign; sNo.border = thinBorder;

    ws1.mergeCells(20, 2, 21, 2);
    const sDate = ws1.getCell(20, 2);
    sDate.value = 'Tanggal'; sDate.font = headerFont; sDate.fill = headerFill; sDate.alignment = headerAlign; sDate.border = thinBorder;

    ws1.mergeCells(20, 3, 21, 3);
    const sDay = ws1.getCell(20, 3);
    sDay.value = 'Hari'; sDay.font = headerFont; sDay.fill = headerFill; sDay.alignment = headerAlign; sDay.border = thinBorder;

    // For each day: Hadir, Lengkap D&P columns
    // But let's simplify: Hadir count and Lengkap D&P count per day
    ws1.mergeCells(20, 4, 20, 5);
    const sHadirMerge = ws1.getCell(20, 4);
    sHadirMerge.value = 'Jumlah Perangkat'; sHadirMerge.font = headerFont; sHadirMerge.fill = headerFill; sHadirMerge.alignment = headerAlign; sHadirMerge.border = thinBorder;

    const sHadirLabel = ws1.getCell(21, 4);
    sHadirLabel.value = 'Hadir'; sHadirLabel.font = headerFont; sHadirLabel.fill = headerFill; sHadirLabel.alignment = headerAlign; sHadirLabel.border = thinBorder;

    const sLengkapLabel = ws1.getCell(21, 5);
    sLengkapLabel.value = 'Lengkap D&P'; sLengkapLabel.font = headerFont; sLengkapLabel.fill = headerFill; sLengkapLabel.alignment = headerAlign; sLengkapLabel.border = thinBorder;

    r20.commit();
    r21.commit();

    // Data rows for daily summary
    for (let d = 1; d <= totalDays; d++) {
      const row = ws1.getRow(21 + d);
      row.height = 18;
      const we = isWeekend(year, month, d);

      const cNo2 = row.getCell(1);
      cNo2.value = d;
      cNo2.alignment = { horizontal: 'center', vertical: 'middle' };
      cNo2.border = thinBorder;

      const dateStr2 = `${d} ${MONTH_NAMES_ID[month]} ${year}`;
      const cDate = row.getCell(2);
      cDate.value = dateStr2;
      cDate.alignment = { horizontal: 'center', vertical: 'middle' };
      cDate.border = thinBorder;

      const DAY_NAMES_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const cDay2 = row.getCell(3);
      cDay2.value = DAY_NAMES_FULL[new Date(year, month, d).getDay()];
      cDay2.alignment = { horizontal: 'center', vertical: 'middle' };
      cDay2.border = thinBorder;

      if (we) {
        cNo2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
        cDate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
        cDay2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
        cDay2.font = { color: { argb: CLR.darkGray }, italic: true };
      }

      const cHadir2 = row.getCell(4);
      cHadir2.value = we ? '-' : dailyHadirCount[d - 1];
      cHadir2.alignment = { horizontal: 'center', vertical: 'middle' };
      cHadir2.border = thinBorder;
      cHadir2.font = { bold: true };
      if (we) {
        cHadir2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
        cHadir2.font = { color: { argb: CLR.darkGray } };
      }

      const cLengkap2 = row.getCell(5);
      cLengkap2.value = we ? '-' : dailyLengkapCount[d - 1];
      cLengkap2.alignment = { horizontal: 'center', vertical: 'middle' };
      cLengkap2.border = thinBorder;
      cLengkap2.font = { bold: true };
      if (we) {
        cLengkap2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightGray } };
        cLengkap2.font = { color: { argb: CLR.darkGray } };
      }

      row.commit();
    }

    // ═══════════════════════════════════════════════════════════
    // SHEET 2: Riwayat Absensi
    // ═══════════════════════════════════════════════════════════
    const ws2 = workbook.addWorksheet('Riwayat Absensi');
    const sheet2Headers = [
      'No', 'Tanggal', 'NIPD', 'Nama', 'Jabatan', 'Status',
      'Jam Datang', 'Jam Pulang', 'Kategori', 'Metode',
      'GPS Datang', 'GPS Pulang',
    ];

    // Set widths
    const sheet2Widths = [5, 14, 14, 28, 22, 10, 12, 12, 10, 10, 22, 22];
    sheet2Widths.forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

    // Header row
    const h2 = ws2.getRow(1);
    h2.height = 22;
    for (let i = 0; i < sheet2Headers.length; i++) {
      const cell = h2.getCell(i + 1);
      cell.value = sheet2Headers[i];
      cell.font  = { bold: true, size: 10, color: { argb: CLR.white } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.darkGreen } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    }
    h2.commit();

    // Group absensi by (nipd, date) for combining DATANG/PULANG
    const groupedAbsensi = new Map<string, {
      nipd: string; nama: string; jabatan: string; dateStr: string;
      jamDatang: string | null; jamPulang: string | null;
      kategori: string; gpsDatang: string | null; gpsPulang: string | null;
    }>();

    for (const a of absensiList) {
      const dateStr = formatDateWIB(a.tanggal);
      const key = `${a.perangkatDesa.nipd}|${dateStr}`;
      if (!groupedAbsensi.has(key)) {
        groupedAbsensi.set(key, {
          nipd: a.perangkatDesa.nipd,
          nama: a.perangkatDesa.namaLengkap,
          jabatan: a.perangkatDesa.jabatan,
          dateStr,
          jamDatang: null,
          jamPulang: null,
          kategori: a.kategori,
          gpsDatang: null,
          gpsPulang: null,
        });
      }
      const entry = groupedAbsensi.get(key)!;
      if (a.tipe === 'DATANG') {
        entry.jamDatang = a.waktu;
        entry.gpsDatang = a.gpsLat && a.gpsLng ? `${a.gpsLat}, ${a.gpsLng}` : null;
      } else if (a.tipe === 'PULANG') {
        entry.jamPulang = a.waktu;
        entry.gpsPulang = a.gpsLat && a.gpsLng ? `${a.gpsLat}, ${a.gpsLng}` : null;
      }
    }

    // Sort by date desc
    const sortedEntries = Array.from(groupedAbsensi.values()).sort((a, b) =>
      b.dateStr.localeCompare(a.dateStr),
    );

    for (let i = 0; i < sortedEntries.length; i++) {
      const e = sortedEntries[i];
      const row = ws2.getRow(i + 2);
      row.height = 18;

      const hasDatang = !!e.jamDatang;
      const hasPulang = !!e.jamPulang;
      let status: string;
      if (hasDatang && hasPulang) status = 'Hadir Lengkap';
      else if (hasDatang) status = 'Hadir (Tanpa Pulang)';
      else status = 'Tidak Hadir';

      const values = [
        i + 1,
        e.dateStr,
        e.nipd,
        e.nama,
        e.jabatan,
        status,
        e.jamDatang || '-',
        e.jamPulang || '-',
        e.kategori,
        'QR Code',  // Metode - always QR for this system
        e.gpsDatang || '-',
        e.gpsPulang || '-',
      ];

      for (let j = 0; j < values.length; j++) {
        const cell = row.getCell(j + 1);
        cell.value = values[j];
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: j < 3 ? 'center' : 'left' };

        // Color code status
        if (j === 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (status === 'Hadir Lengkap') {
            cell.font = { bold: true, color: { argb: CLR.darkGreen.replace('FF', '') } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightMint } };
          } else if (status === 'Hadir (Tanpa Pulang)') {
            cell.font = { bold: true, color: { argb: CLR.darkGold.replace('FF', '') } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightCream } };
          } else {
            cell.font = { bold: true, color: { argb: CLR.red.replace('FF', '') } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightPink } };
          }
        }
      }
      row.commit();
    }

    // ═══════════════════════════════════════════════════════════
    // SHEET 3: Data Perangkat Desa
    // ═══════════════════════════════════════════════════════════
    const ws3 = workbook.addWorksheet('Data Perangkat Desa');
    const sheet3Headers = [
      'No', 'NIPD', 'Nama Lengkap', 'NIK', 'Jabatan',
      'Jenis Kelamin', 'Pendidikan', 'Nomor SK', 'Status', 'Keterangan',
    ];
    const sheet3Widths = [5, 14, 28, 20, 22, 14, 14, 18, 10, 24];
    sheet3Widths.forEach((w, i) => { ws3.getColumn(i + 1).width = w; });

    // Header row
    const h3 = ws3.getRow(1);
    h3.height = 22;
    for (let i = 0; i < sheet3Headers.length; i++) {
      const cell = h3.getCell(i + 1);
      cell.value = sheet3Headers[i];
      cell.font  = { bold: true, size: 10, color: { argb: CLR.white } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.darkGreen } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    }
    h3.commit();

    // Data rows
    for (let i = 0; i < perangkatList.length; i++) {
      const p = perangkatList[i];
      const row = ws3.getRow(i + 2);
      row.height = 18;

      const values = [
        i + 1,
        p.nipd,
        p.namaLengkap,
        p.nik || '-',
        p.jabatan,
        p.jenisKelamin || '-',
        p.pendidikanTerakhir || '-',
        p.nomorSK || '-',
        p.status,
        p.keterangan || '-',
      ];

      for (let j = 0; j < values.length; j++) {
        const cell = row.getCell(j + 1);
        cell.value = values[j];
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: j < 2 || j === 8 ? 'center' : 'left' };

        // Highlight status column
        if (j === 8) {
          if (p.status === 'AKTIF') {
            cell.font = { bold: true, color: { argb: '17492C' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightMint } };
          } else {
            cell.font = { bold: true, color: { argb: CLR.red.replace('FF', '') } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.lightPink } };
          }
        }

        // Bold name
        if (j === 2) {
          cell.font = { bold: true, color: { argb: '17492C' } };
        }
      }
      row.commit();
    }

    // ── Write workbook to buffer ──
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `Rekap-Absensi-Desa-Pekik-Nyaring-${from}-sd-${to}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (error) {
    console.error('Export absensi error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server saat mengekspor data' },
      { status: 500 },
    );
  }
}
