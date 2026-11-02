<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/api.php';

function assertWorkbook(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$pdo = new PDO('sqlite::memory:', options: [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$pdo->exec(
    'CREATE TABLE PerangkatDesa (
        id TEXT PRIMARY KEY, nipd TEXT, namaLengkap TEXT, nik TEXT,
        tempatTanggalLahir TEXT, jenisKelamin TEXT, pendidikanTerakhir TEXT,
        nomorSK TEXT, jabatan TEXT, kecamatan TEXT, desa TEXT, status TEXT,
        keterangan TEXT, createdAt TEXT, updatedAt TEXT
    )'
);
$pdo->exec(
    'CREATE TABLE Absensi (
        id TEXT PRIMARY KEY, perangkatDesaId TEXT, tipe TEXT, kategori TEXT,
        tanggal TEXT, waktu TEXT, gpsLat TEXT, gpsLng TEXT, gpsAccuracy TEXT,
        createdAt TEXT, updatedAt TEXT
    )'
);
$device = $pdo->prepare(
    'INSERT INTO PerangkatDesa
        (id, nipd, namaLengkap, nik, jenisKelamin, pendidikanTerakhir, nomorSK,
         jabatan, kecamatan, desa, status, keterangan, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$device->execute([
    'device-1', 'NIPD-AA-40@01011986-ABCD', 'Ayu & Budi', '1234567890123456',
    'Perempuan', 'SMA', 'SK-01', 'Sekretaris', 'Pondok Kelapa', 'Pekik Nyaring',
    'AKTIF', 'Uji <XML>', '2026-01-01 00:00:00', '2026-01-01 00:00:00',
]);
$device->execute([
    'device-2', 'NIPD-CD-35@01011991-EFGH', 'Citra Dewi', null,
    'Perempuan', 'S1', 'SK-02', 'Bendahara', 'Pondok Kelapa', 'Pekik Nyaring',
    'PASIF', null, '2026-01-01 00:00:00', '2026-01-01 00:00:00',
]);
$attendance = $pdo->prepare(
    'INSERT INTO Absensi
        (id, perangkatDesaId, tipe, kategori, tanggal, waktu, gpsLat, gpsLng, gpsAccuracy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$rows = [
    ['a1', 'device-1', 'DATANG', 'AKTIF', '2026-03-02 02:00:00.000', '09:00:00', '-3.1', '102.2'],
    ['a2', 'device-1', 'PULANG', 'AKTIF', '2026-03-02 10:00:00.000', '17:00:00', '-3.1', '102.2'],
    ['a3', 'device-2', 'DATANG', 'PASIF', '2026-03-03 02:00:00.000', '09:00:00', null, null],
    ['a4', 'device-2', 'PULANG', 'PASIF', '2026-03-04 10:00:00.000', '17:00:00', null, null],
];
foreach ($rows as [$id, $deviceId, $type, $category, $date, $time, $lat, $lng]) {
    $attendance->execute([$id, $deviceId, $type, $category, $date, $time, $lat, $lng, null, $date, $date]);
}

$filename = dirname(__DIR__) . '/runtime/xlsx-export-test.xlsx';
try {
    writeAttendanceWorkbook($pdo, '2026-03-01', '2026-03-31', $filename);
    $zip = new ZipArchive();
    assertWorkbook($zip->open($filename) === true, 'Generated XLSX did not open as a ZIP archive.');
    $workbook = simplexml_load_string($zip->getFromName('xl/workbook.xml'));
    $relations = simplexml_load_string($zip->getFromName('xl/_rels/workbook.xml.rels'));
    $types = simplexml_load_string($zip->getFromName('[Content_Types].xml'));
    assertWorkbook($workbook !== false && $relations !== false && $types !== false, 'Workbook package XML is invalid.');
    $workbook->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
    $workbook->registerXPathNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');
    $names = [];
    foreach ($workbook->xpath('//x:sheets/x:sheet') as $sheet) {
        $names[] = (string) $sheet['name'];
    }
    assertWorkbook($names === ['Rekap Bulanan', 'Riwayat Absensi', 'Data Perangkat Desa'], 'Workbook must contain the three expected sheets in order.');
    $relations->registerXPathNamespace('p', 'http://schemas.openxmlformats.org/package/2006/relationships');
    assertWorkbook(count($relations->xpath('//p:Relationship[contains(@Type, "worksheet")]')) === 3, 'Expected three worksheet relationships.');
    $types->registerXPathNamespace('c', 'http://schemas.openxmlformats.org/package/2006/content-types');
    assertWorkbook(count($types->xpath('//c:Override[contains(@PartName, "sheet") and contains(@ContentType, "worksheet")]')) === 3, 'Expected three worksheet content types.');

    $sheets = [];
    foreach ([1, 2, 3] as $index) {
        $xml = simplexml_load_string($zip->getFromName('xl/worksheets/sheet' . $index . '.xml'));
        assertWorkbook($xml !== false, "Worksheet {$index} XML is invalid.");
        $xml->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $sheets[] = $xml;
    }
    $cellText = static function (SimpleXMLElement $sheet, string $reference): string {
        $cells = $sheet->xpath('//x:c[@r="' . $reference . '"]');
        if (!$cells) {
            return '';
        }
        if (isset($cells[0]->v)) {
            return (string) $cells[0]->v;
        }
        return (string) ($cells[0]->is->t ?? '');
    };
    assertWorkbook($cellText($sheets[0], 'E6') === 'DP', 'Monthly summary should mark both check-ins as DP.');
    assertWorkbook($cellText($sheets[0], 'F7') === 'D', 'Monthly summary should mark check-in only as D.');
    assertWorkbook($cellText($sheets[0], 'G7') === 'P', 'Monthly summary should mark check-out only as P.');
    assertWorkbook($cellText($sheets[0], 'AI6') === '1' && $cellText($sheets[0], 'AJ6') === '1', 'Monthly attendance totals are incorrect.');
    assertWorkbook($cellText($sheets[0], 'AI7') === '2' && $cellText($sheets[0], 'AJ7') === '0', 'Partial attendance totals are incorrect.');
    assertWorkbook($cellText($sheets[0], 'D13') === '1' && $cellText($sheets[0], 'E13') === '1', 'Per-day totals for a complete attendance are incorrect.');
    assertWorkbook($cellText($sheets[0], 'D14') === '1' && $cellText($sheets[0], 'E14') === '0', 'Per-day totals for a partial attendance are incorrect.');
    assertWorkbook($cellText($sheets[1], 'A1') === 'No' && $cellText($sheets[1], 'F2') === 'Hadir Lengkap', 'Attendance history sheet is missing expected data.');
    assertWorkbook($cellText($sheets[1], 'F4') === 'Pulang Tanpa Datang', 'Attendance history must identify check-out without check-in.');
    assertWorkbook($cellText($sheets[2], 'A1') === 'No' && $cellText($sheets[2], 'C2') === 'Ayu & Budi', 'Device sheet is missing device data.');
    assertWorkbook($cellText($sheets[2], 'J2') === 'Uji <XML>', 'Device text must be escaped and retained.');
    $zip->close();
    $zip = null;
    echo "XLSX export test passed: 3 worksheets, relationships, content types, summary, daily counts, history, and devices.\n";
} finally {
    if (isset($zip) && $zip instanceof ZipArchive) {
        $zip->close();
    }
    if (getenv('KEEP_XLSX_TEST') !== '1' && is_file($filename)) {
        unlink($filename);
    }
}
