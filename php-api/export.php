<?php
declare(strict_types=1);

function exportAttendanceWorkbook(PDO $pdo, string $from, string $to): never
{
    require_once __DIR__ . '/vendor/autoload.php';

    foreach (['from' => $from, 'to' => $to] as $key => $value) {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            http_response_code(400);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => "Parameter {$key} wajib berformat YYYY-MM-DD"]);
            exit;
        }
    }
    if ($from > $to) {
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Tanggal awal tidak boleh setelah tanggal akhir']);
        exit;
    }

    $fromUtc = (new DateTimeImmutable($from . ' 00:00:00', new DateTimeZone('Asia/Jakarta')))
        ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $toUtc = (new DateTimeImmutable($to . ' 23:59:59.999999', new DateTimeZone('Asia/Jakarta')))
        ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    $devices = $pdo->query('SELECT * FROM PerangkatDesa ORDER BY nipd ASC')->fetchAll();
    $query = $pdo->prepare(
        'SELECT a.*, p.nipd, p.namaLengkap, p.jabatan
         FROM Absensi a
         INNER JOIN PerangkatDesa p ON p.id = a.perangkatDesaId
         WHERE a.tanggal BETWEEN :from AND :to ORDER BY a.tanggal ASC'
    );
    $query->execute(['from' => $fromUtc, 'to' => $toUtc]);
    $attendanceRows = $query->fetchAll();
    $attendance = [];
    $history = [];
    foreach ($attendanceRows as $record) {
        $localDate = (new DateTimeImmutable($record['tanggal'], new DateTimeZone('UTC')))
            ->setTimezone(new DateTimeZone('Asia/Jakarta'));
        $date = $localDate->format('Y-m-d');
        $key = $record['perangkatDesaId'] . '|' . $date;
        $attendance[$key][$record['tipe']] = true;
        if (!isset($history[$key])) {
            $history[$key] = [
                'tanggal' => $date,
                'nipd' => $record['nipd'],
                'nama' => $record['namaLengkap'],
                'jabatan' => $record['jabatan'],
                'kategori' => $record['kategori'],
                'datang' => null,
                'pulang' => null,
                'gpsDatang' => null,
                'gpsPulang' => null,
            ];
        }
        $isComing = $record['tipe'] === 'DATANG';
        $history[$key][$isComing ? 'datang' : 'pulang'] = $record['waktu'];
        $history[$key][$isComing ? 'gpsDatang' : 'gpsPulang'] =
            $record['gpsLat'] !== null && $record['gpsLng'] !== null
                ? $record['gpsLat'] . ', ' . $record['gpsLng']
                : '-';
    }

    $column = static fn (int $number, int $row): string =>
        \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($number) . $row;
    $headerStyle = static function ($sheet, string $range): void {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF17492C'],
            ],
            'alignment' => ['horizontal' => 'center', 'vertical' => 'center', 'wrapText' => true],
        ]);
    };
    $borders = static function ($sheet, string $range): void {
        $sheet->getStyle($range)->getBorders()->getAllBorders()
            ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
            ->getColor()->setARGB('FF555555');
    };
    $configureSheet = static function ($sheet): void {
        $sheet->setShowGridlines(false);
        $sheet->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setFitToWidth(1)
            ->setFitToHeight(0);
        $sheet->getPageSetup()->setFitToPage(true);
    };

    $months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    $shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    $longDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    $month = new DateTimeImmutable(substr($from, 0, 7) . '-01', new DateTimeZone('Asia/Jakarta'));
    $year = (int) $month->format('Y');
    $monthNumber = (int) $month->format('n');
    $daysInMonth = (int) $month->format('t');
    $lastCalendarDay = $month->setDate($year, $monthNumber, $daysInMonth)->format('Y-m-d');
    $monthLastColumn = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($daysInMonth + 6);

    $workbook = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
    $workbook->getProperties()
        ->setCreator('Sistem Absensi Desa Pekik Nyaring')
        ->setTitle('Rekap Absensi Perangkat Desa');
    $summary = $workbook->getActiveSheet();
    $summary->setTitle('Rekap Bulanan');
    $configureSheet($summary);
    $summary->mergeCells("A1:{$monthLastColumn}1");
    $summary->setCellValue(
        'A1',
        'REKAP ABSENSI PERANGKAT DESA - ' . strtoupper($months[$monthNumber - 1]) . ' ' . $year
    );
    $summary->getRowDimension(1)->setRowHeight(36);
    $summary->getStyle("A1:{$monthLastColumn}1")->applyFromArray([
        'font' => ['bold' => true, 'size' => 16, 'color' => ['argb' => 'FFC9A227']],
        'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF17492C']],
        'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
    ]);
    $summary->mergeCells("A2:{$monthLastColumn}2");
    $summary->setCellValue('A2', 'Pemerintah Desa Pekik Nyaring - Kec. Pondok Kelapa, Kab. Bengkulu Tengah');
    $summary->getRowDimension(2)->setRowHeight(22);
    $summary->getStyle("A2:{$monthLastColumn}2")->applyFromArray([
        'font' => ['size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
        'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E6339']],
        'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
    ]);
    foreach ([
        ['A3:C3', 'DP = Datang & Pulang', 'FFDCEFE2', 'FF17492C'],
        ['D3:G3', 'D = Hanya Datang', 'FFF7EFD4', 'FF7A6210'],
        ['H3:K3', 'Kosong = Tidak Absen', 'FFFDECEA', 'FFC0392B'],
        ['L3:O3', 'Abu-abu = Akhir Pekan', 'FFE8E8E8', 'FF555555'],
    ] as [$range, $label, $fill, $font]) {
        $summary->mergeCells($range);
        $cell = explode(':', $range)[0];
        $summary->setCellValue($cell, $label);
        $summary->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['argb' => $font]],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => $fill]],
            'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
        ]);
    }
    $summary->getRowDimension(3)->setRowHeight(20);

    foreach (['A' => 'No', 'B' => 'Nama Perangkat Desa', 'C' => 'Jabatan'] as $letter => $label) {
        $summary->mergeCells("{$letter}4:{$letter}5");
        $summary->setCellValue("{$letter}4", $label);
    }
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $date = $month->setDate($year, $monthNumber, $day);
        $dayColumn = 3 + $day;
        $summary->setCellValue($column($dayColumn, 4), $day);
        $summary->setCellValue($column($dayColumn, 5), $shortDays[(int) $date->format('w')]);
        $summary->getColumnDimensionByColumn($dayColumn)->setWidth(5);
    }
    $presentColumn = $daysInMonth + 4;
    $completeColumn = $daysInMonth + 5;
    $absentColumn = $daysInMonth + 6;
    foreach ([
        $presentColumn => 'Hadir',
        $completeColumn => 'Lengkap D&P',
        $absentColumn => 'Tidak Hadir',
    ] as $number => $label) {
        $cell = $column($number, 4);
        $summary->mergeCells($cell . ':' . $column($number, 5));
        $summary->setCellValue($cell, $label);
    }
    foreach (['A' => 5, 'B' => 30, 'C' => 24] as $letter => $width) {
        $summary->getColumnDimension($letter)->setWidth($width);
    }
    foreach ([$presentColumn => 8, $completeColumn => 13, $absentColumn => 13] as $number => $width) {
        $summary->getColumnDimensionByColumn($number)->setWidth($width);
    }
    $summary->getRowDimension(4)->setRowHeight(22);
    $summary->getRowDimension(5)->setRowHeight(18);
    $headerStyle($summary, "A4:{$monthLastColumn}5");
    $borders($summary, "A4:{$monthLastColumn}5");

    $workingDaysInRange = 0;
    $daysCursor = new DateTimeImmutable(max($from, $month->format('Y-m-d')), new DateTimeZone('Asia/Jakarta'));
    $rangeEndInMonth = min($to, $lastCalendarDay);
    while ($daysCursor->format('Y-m-d') <= $rangeEndInMonth) {
        if ((int) $daysCursor->format('N') <= 5) {
            $workingDaysInRange++;
        }
        $daysCursor = $daysCursor->modify('+1 day');
    }

    foreach ($devices as $index => $device) {
        $rowNumber = $index + 6;
        $summary->fromArray([$index + 1, $device['namaLengkap'], $device['jabatan']], null, 'A' . $rowNumber);
        $summary->getStyle("A{$rowNumber}:{$monthLastColumn}{$rowNumber}")->getAlignment()
            ->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);
        $summary->getStyle("A{$rowNumber}")->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $summary->getStyle("B{$rowNumber}")->getFont()->setBold(true)->getColor()->setARGB('FF17492C');
        $presentDays = 0;
        $completeDays = 0;
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = $month->setDate($year, $monthNumber, $day);
            $dateKey = $date->format('Y-m-d');
            $selected = $dateKey >= $from && $dateKey <= $to;
            $weekend = (int) $date->format('N') > 5;
            $types = $attendance[$device['id'] . '|' . $dateKey] ?? [];
            $value = !$selected
                ? ''
                : (isset($types['DATANG'], $types['PULANG'])
                    ? 'DP'
                    : (isset($types['DATANG']) ? 'D' : (isset($types['PULANG']) ? 'P' : '')));
            if ($selected && $value !== '') {
                $presentDays++;
            }
            if ($selected && $value === 'DP') {
                $completeDays++;
            }

            $cell = $column(3 + $day, $rowNumber);
            $summary->setCellValue($cell, $value);
            $fill = $weekend ? 'FFE8E8E8' : 'FFFDECEA';
            $font = 'FFC0392B';
            if ($value === 'DP' && !$weekend) {
                $fill = 'FFDCEFE2';
                $font = 'FF17492C';
            } elseif ($value !== '' && !$weekend) {
                $fill = 'FFF7EFD4';
                $font = 'FF7A6210';
            } elseif ($weekend && $value !== '') {
                $font = 'FF555555';
            }
            $summary->getStyle($cell)->applyFromArray([
                'font' => ['bold' => $value !== '', 'color' => ['argb' => $font]],
                'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => $fill]],
                'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
            ]);
        }
        $summary->setCellValue($column($presentColumn, $rowNumber), $presentDays);
        $summary->setCellValue($column($completeColumn, $rowNumber), $completeDays);
        $summary->setCellValue($column($absentColumn, $rowNumber), max(0, $workingDaysInRange - $presentDays));
        $summary->getStyle($column($presentColumn, $rowNumber) . ':' . $column($absentColumn, $rowNumber))
            ->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
    }
    $deviceLastRow = count($devices) + 5;
    if ($devices) {
        $borders($summary, "A6:{$monthLastColumn}{$deviceLastRow}");
    }

    $dailyTitleRow = count($devices) + 7;
    $dailyHeaderRow = $dailyTitleRow + 1;
    $dailySubheaderRow = $dailyTitleRow + 2;
    $dailyFirstRow = $dailyTitleRow + 3;
    $summary->mergeCells("A{$dailyTitleRow}:{$monthLastColumn}{$dailyTitleRow}");
    $summary->setCellValue("A{$dailyTitleRow}", 'REKAP KEHADIRAN PER HARI');
    $summary->getStyle("A{$dailyTitleRow}:{$monthLastColumn}{$dailyTitleRow}")->applyFromArray([
        'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
        'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E6339']],
        'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
    ]);
    foreach (['A' => 'No', 'B' => 'Tanggal', 'C' => 'Hari'] as $letter => $label) {
        $summary->mergeCells("{$letter}{$dailyHeaderRow}:{$letter}{$dailySubheaderRow}");
        $summary->setCellValue("{$letter}{$dailyHeaderRow}", $label);
    }
    $summary->mergeCells("D{$dailyHeaderRow}:E{$dailyHeaderRow}");
    $summary->setCellValue("D{$dailyHeaderRow}", 'Jumlah Perangkat');
    $summary->setCellValue("D{$dailySubheaderRow}", 'Hadir');
    $summary->setCellValue("E{$dailySubheaderRow}", 'Lengkap D&P');
    $headerStyle($summary, "A{$dailyHeaderRow}:E{$dailySubheaderRow}");
    $borders($summary, "A{$dailyHeaderRow}:E{$dailySubheaderRow}");
    foreach (['A' => 5, 'B' => 24, 'C' => 14, 'D' => 14, 'E' => 14] as $letter => $width) {
        $summary->getColumnDimension($letter)->setWidth($width);
    }
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $date = $month->setDate($year, $monthNumber, $day);
        $dateKey = $date->format('Y-m-d');
        $presentCount = 0;
        $completeCount = 0;
        foreach ($devices as $device) {
            $types = $attendance[$device['id'] . '|' . $dateKey] ?? [];
            $presentCount += isset($types['DATANG']) ? 1 : 0;
            $completeCount += isset($types['DATANG'], $types['PULANG']) ? 1 : 0;
        }
        $rowNumber = $dailyFirstRow + $day - 1;
        $summary->fromArray([
            $day,
            $day . ' ' . $months[$monthNumber - 1] . ' ' . $year,
            $longDays[(int) $date->format('w')],
            $presentCount,
            $completeCount,
        ], null, 'A' . $rowNumber);
        $summary->getStyle("A{$rowNumber}:E{$rowNumber}")->getAlignment()
            ->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);
        $summary->getStyle("A{$rowNumber}:A{$rowNumber}")->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $summary->getStyle("D{$rowNumber}:E{$rowNumber}")->getFont()->setBold(true);
        if ((int) $date->format('N') > 5) {
            $summary->getStyle("A{$rowNumber}:E{$rowNumber}")->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFE8E8E8');
        }
    }
    $dailyLastRow = $dailyFirstRow + $daysInMonth - 1;
    $borders($summary, "A{$dailyFirstRow}:E{$dailyLastRow}");
    $summary->getPageSetup()->setPrintArea("A1:{$monthLastColumn}{$dailyLastRow}");

    $historySheet = $workbook->createSheet();
    $historySheet->setTitle('Riwayat Absensi');
    $configureSheet($historySheet);
    $historyHeaders = [
        'No', 'Tanggal', 'NIPD', 'Nama', 'Jabatan', 'Status', 'Jam Datang',
        'Jam Pulang', 'Kategori', 'Metode', 'GPS Datang', 'GPS Pulang',
    ];
    foreach ($historyHeaders as $index => $label) {
        $historySheet->setCellValue($column($index + 1, 1), $label);
    }
    $headerStyle($historySheet, 'A1:L1');
    $historyRows = array_values($history);
    usort($historyRows, static fn (array $left, array $right): int =>
        [$left['tanggal'], $left['nama']] <=> [$right['tanggal'], $right['nama']]
    );
    foreach ($historyRows as $index => $record) {
        $status = $record['datang'] !== null && $record['pulang'] !== null
            ? 'Hadir Lengkap'
            : ($record['datang'] !== null ? 'Hadir (Tanpa Pulang)' : 'Pulang Tanpa Datang');
        $historySheet->fromArray([
            $index + 1,
            $record['tanggal'],
            $record['nipd'],
            $record['nama'],
            $record['jabatan'],
            $status,
            $record['datang'] ?? '-',
            $record['pulang'] ?? '-',
            $record['kategori'],
            'Absensi Aplikasi',
            $record['gpsDatang'] ?? '-',
            $record['gpsPulang'] ?? '-',
        ], null, 'A' . ($index + 2));
    }
    $historyEndRow = max(1, count($historyRows) + 1);
    $borders($historySheet, "A1:L{$historyEndRow}");
    $historySheet->freezePane('A2');
    $historySheet->setAutoFilter("A1:L{$historyEndRow}");
    foreach (['A' => 5, 'B' => 14, 'C' => 25, 'D' => 28, 'E' => 24, 'F' => 24, 'G' => 14, 'H' => 14, 'I' => 12, 'J' => 20, 'K' => 25, 'L' => 25] as $letter => $width) {
        $historySheet->getColumnDimension($letter)->setWidth($width);
    }

    $deviceSheet = $workbook->createSheet();
    $deviceSheet->setTitle('Data Perangkat Desa');
    $configureSheet($deviceSheet);
    $deviceHeaders = [
        'No', 'NIPD', 'Nama Lengkap', 'NIK', 'Jabatan',
        'Jenis Kelamin', 'Pendidikan', 'Nomor SK', 'Status', 'Keterangan',
    ];
    foreach ($deviceHeaders as $index => $label) {
        $deviceSheet->setCellValue($column($index + 1, 1), $label);
    }
    $headerStyle($deviceSheet, 'A1:J1');
    foreach ($devices as $index => $device) {
        $deviceSheet->fromArray([
            $index + 1,
            $device['nipd'],
            $device['namaLengkap'],
            $device['nik'] ?: '-',
            $device['jabatan'],
            $device['jenisKelamin'] ?: '-',
            $device['pendidikanTerakhir'] ?: '-',
            $device['nomorSK'] ?: '-',
            $device['status'],
            $device['keterangan'] ?: '-',
        ], null, 'A' . ($index + 2));
    }
    $deviceEndRow = max(1, count($devices) + 1);
    $borders($deviceSheet, "A1:J{$deviceEndRow}");
    $deviceSheet->freezePane('A2');
    $deviceSheet->setAutoFilter("A1:J{$deviceEndRow}");
    foreach (['A' => 5, 'B' => 25, 'C' => 28, 'D' => 20, 'E' => 24, 'F' => 16, 'G' => 18, 'H' => 14, 'I' => 12, 'J' => 36] as $letter => $width) {
        $deviceSheet->getColumnDimension($letter)->setWidth($width);
    }

    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header("Content-Disposition: attachment; filename=\"Rekap-Absensi-Desa-Pekik-Nyaring-{$from}-sd-{$to}.xlsx\"");
    header('Cache-Control: no-store');
    (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($workbook))->save('php://output');
    exit;
}
