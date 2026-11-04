<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/nipd.php';

date_default_timezone_set('UTC');
ini_set('display_errors', '0');

function respondJson(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function isHttpsRequest(): bool
{
    return (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function startAdminSession(): void
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    session_name('ABSENSI_SESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isHttpsRequest(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 1500000) {
        respondJson(['success' => false, 'message' => 'Ukuran permintaan melebihi batas.'], 413);
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        respondJson(['success' => false, 'message' => 'Format permintaan tidak valid.'], 400);
    }

    return $body;
}

function requestOriginIsSameSite(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        if ($referer === '') {
            return true;
        }
        $origin = $referer;
    }

    $parts = parse_url($origin);
    if (!is_array($parts) || empty($parts['host'])) {
        return false;
    }
    $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $originHost = strtolower($parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : ''));
    $requestScheme = isHttpsRequest() ? 'https' : 'http';
    return hash_equals($requestHost, $originHost)
        && strtolower((string) ($parts['scheme'] ?? '')) === $requestScheme;
}

function requireSameOrigin(): void
{
    if (!requestOriginIsSameSite()) {
        respondJson(['success' => false, 'message' => 'Asal permintaan tidak diizinkan. Muat ulang halaman.'], 403);
    }
}

function requireAdmin(): array
{
    if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_username'])) {
        respondJson(['success' => false, 'message' => 'Sesi berakhir. Silakan masuk kembali.'], 401);
    }
    return ['id' => (string) $_SESSION['admin_id'], 'username' => (string) $_SESSION['admin_username']];
}

function requireCsrf(): void
{
    $supplied = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string) ($_SESSION['csrf_token'] ?? '');
    if ($supplied === '' || $expected === '' || !hash_equals($expected, $supplied)) {
        respondJson(['success' => false, 'message' => 'Token keamanan tidak valid. Muat ulang halaman.'], 403);
    }
    requireSameOrigin();
}

function newCsrfToken(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function dateInput(string $key): ?string
{
    $value = trim((string) ($_GET[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        respondJson(['success' => false, 'message' => "Tanggal {$key} harus berformat YYYY-MM-DD."], 400);
    }
    return $value;
}

function deviceSelect(PDO $pdo): array
{
    return $pdo->query('SELECT * FROM PerangkatDesa ORDER BY nipd ASC')->fetchAll();
}

function formatDevice(array $device): array
{
    foreach (['createdAt', 'updatedAt'] as $field) {
        $device[$field] = dateToIso($device[$field] ?? null);
    }
    return $device;
}

function attendanceSelect(): string
{
    return 'SELECT a.id, a.perangkatDesaId, a.tipe, a.kategori, a.tanggal,
                   a.waktu, a.gpsLat, a.gpsLng, a.gpsAccuracy, a.createdAt, a.updatedAt,
                   p.id AS perangkatId, p.nipd, p.namaLengkap, p.nik,
                   p.tempatTanggalLahir, p.jenisKelamin, p.pendidikanTerakhir,
                   p.nomorSK, p.jabatan, p.kecamatan, p.desa, p.status, p.keterangan,
                   p.createdAt AS perangkatCreatedAt, p.updatedAt AS perangkatUpdatedAt
            FROM Absensi a
            INNER JOIN PerangkatDesa p ON p.id = a.perangkatDesaId';
}

function formatAttendance(array $row): array
{
    $device = [
        'id' => $row['perangkatId'],
        'nipd' => $row['nipd'],
        'namaLengkap' => $row['namaLengkap'],
        'nik' => $row['nik'],
        'tempatTanggalLahir' => $row['tempatTanggalLahir'],
        'jenisKelamin' => $row['jenisKelamin'],
        'pendidikanTerakhir' => $row['pendidikanTerakhir'],
        'nomorSK' => $row['nomorSK'],
        'jabatan' => $row['jabatan'],
        'kecamatan' => $row['kecamatan'],
        'desa' => $row['desa'],
        'status' => $row['status'],
        'keterangan' => $row['keterangan'],
        'createdAt' => dateToIso($row['perangkatCreatedAt']),
        'updatedAt' => dateToIso($row['perangkatUpdatedAt']),
    ];
    foreach ([
        'perangkatId', 'nipd', 'namaLengkap', 'nik', 'tempatTanggalLahir',
        'jenisKelamin', 'pendidikanTerakhir', 'nomorSK', 'jabatan', 'kecamatan',
        'desa', 'status', 'keterangan', 'perangkatCreatedAt', 'perangkatUpdatedAt',
    ] as $key) {
        unset($row[$key]);
    }
    $row['tanggal'] = dateToIso($row['tanggal']);
    $row['createdAt'] = dateToIso($row['createdAt']);
    $row['updatedAt'] = dateToIso($row['updatedAt']);
    $row['perangkatDesa'] = $device;
    return $row;
}

function respondDeviceList(PDO $pdo): never
{
    respondJson(['success' => true, 'data' => array_map('formatDevice', deviceSelect($pdo))]);
}

function nullableText(array $body, string $key, int $maxLength = 191): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    if (mb_strlen($value) > $maxLength) {
        respondJson(['success' => false, 'message' => "Kolom {$key} terlalu panjang."], 400);
    }
    return $value;
}

function deviceFields(array $body, bool $isNew = false): array
{
    $name = trim((string) ($body['namaLengkap'] ?? ''));
    $position = trim((string) ($body['jabatan'] ?? ''));
    if ($name === '' || $position === '') {
        respondJson(['success' => false, 'message' => 'Nama lengkap dan jabatan wajib diisi.'], 400);
    }
    if (mb_strlen($name) > 191 || mb_strlen($position) > 191) {
        respondJson(['success' => false, 'message' => 'Nama atau jabatan terlalu panjang.'], 400);
    }
    $status = strtoupper(trim((string) ($body['status'] ?? 'AKTIF')));
    if (!in_array($status, ['AKTIF', 'PASIF'], true)) {
        respondJson(['success' => false, 'message' => 'Status harus AKTIF atau PASIF.'], 400);
    }
    $data = [
        'namaLengkap' => $name,
        'nik' => nullableText($body, 'nik', 32),
        'tempatTanggalLahir' => nullableText($body, 'tempatTanggalLahir'),
        'jenisKelamin' => nullableText($body, 'jenisKelamin', 32),
        'pendidikanTerakhir' => nullableText($body, 'pendidikanTerakhir', 100),
        'nomorSK' => nullableText($body, 'nomorSK', 100),
        'jabatan' => $position,
        'kecamatan' => nullableText($body, 'kecamatan') ?? 'Pondok Kelapa',
        'desa' => nullableText($body, 'desa') ?? 'Pekik Nyaring',
        'status' => $status,
        'keterangan' => nullableText($body, 'keterangan', 10000),
    ];
    if ($isNew) {
        try {
            $data['nipd'] = generateNipd($data);
        } catch (InvalidArgumentException $error) {
            respondJson(['success' => false, 'message' => $error->getMessage()], 400);
        }
    }
    return $data;
}

function saveDevice(PDO $pdo): never
{
    $body = readJsonBody();
    $data = deviceFields($body, true);
    $now = gmdate('Y-m-d H:i:s.v');
    $data['id'] = newId();
    $data['createdAt'] = $now;
    $data['updatedAt'] = $now;
    $statement = $pdo->prepare(
        'INSERT INTO PerangkatDesa
            (id, nipd, namaLengkap, nik, tempatTanggalLahir, jenisKelamin,
             pendidikanTerakhir, nomorSK, jabatan, kecamatan, desa, status,
             keterangan, createdAt, updatedAt)
         VALUES
            (:id, :nipd, :namaLengkap, :nik, :tempatTanggalLahir, :jenisKelamin,
             :pendidikanTerakhir, :nomorSK, :jabatan, :kecamatan, :desa, :status,
             :keterangan, :createdAt, :updatedAt)'
    );
    try {
        $statement->execute($data);
    } catch (PDOException $error) {
        if ((string) $error->getCode() === '23000') {
            respondJson(['success' => false, 'message' => 'Data berbenturan dengan NIPD atau NIK yang sudah terdaftar.'], 409);
        }
        throw $error;
    }
    $data['createdAt'] = dateToIso($data['createdAt']);
    $data['updatedAt'] = dateToIso($data['updatedAt']);
    respondJson(['success' => true, 'data' => $data], 201);
}

function editDevice(PDO $pdo, string $id): never
{
    $body = readJsonBody();
    $data = deviceFields($body);
    $data['updatedAt'] = gmdate('Y-m-d H:i:s.v');
    $data['id'] = $id;
    $statement = $pdo->prepare(
        'UPDATE PerangkatDesa SET namaLengkap=:namaLengkap, nik=:nik,
            tempatTanggalLahir=:tempatTanggalLahir, jenisKelamin=:jenisKelamin,
            pendidikanTerakhir=:pendidikanTerakhir, nomorSK=:nomorSK,
            jabatan=:jabatan, kecamatan=:kecamatan, desa=:desa, status=:status,
            keterangan=:keterangan, updatedAt=:updatedAt WHERE id=:id'
    );
    $statement->execute($data);
    $query = $pdo->prepare('SELECT * FROM PerangkatDesa WHERE id=?');
    $query->execute([$id]);
    $device = $query->fetch();
    if (!$device) {
        respondJson(['success' => false, 'message' => 'Perangkat desa tidak ditemukan.'], 404);
    }
    respondJson(['success' => true, 'data' => formatDevice($device)]);
}

function deleteDevice(PDO $pdo, string $id): never
{
    $statement = $pdo->prepare('DELETE FROM PerangkatDesa WHERE id=?');
    $statement->execute([$id]);
    if ($statement->rowCount() === 0) {
        respondJson(['success' => false, 'message' => 'Perangkat desa tidak ditemukan.'], 404);
    }
    respondJson(['success' => true, 'message' => 'Data perangkat berhasil dihapus.']);
}

function listAttendance(PDO $pdo): never
{
    $from = dateInput('from');
    $to = dateInput('to');
    $conditions = [];
    $params = [];
    if ($from !== null) {
        $conditions[] = 'a.tanggal >= :from';
        $params['from'] = (new DateTimeImmutable($from . ' 00:00:00', new DateTimeZone('Asia/Jakarta')))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
    if ($to !== null) {
        $conditions[] = 'a.tanggal <= :to';
        $params['to'] = (new DateTimeImmutable($to . ' 23:59:59.999999', new DateTimeZone('Asia/Jakarta')))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    }
    $search = trim((string) ($_GET['search'] ?? ''));
    if ($search !== '') {
        $conditions[] = '(p.namaLengkap LIKE :searchName OR p.nipd LIKE :searchNipd OR p.nik LIKE :searchNik)';
        $params['searchName'] = '%' . $search . '%';
        $params['searchNipd'] = '%' . $search . '%';
        $params['searchNik'] = '%' . $search . '%';
    }
    $query = attendanceSelect();
    if ($conditions) {
        $query .= ' WHERE ' . implode(' AND ', $conditions);
    }
    $query .= ' ORDER BY a.createdAt DESC';
    $statement = $pdo->prepare($query);
    $statement->execute($params);
    respondJson(['success' => true, 'data' => array_map('formatAttendance', $statement->fetchAll())]);
}

function createAttendance(PDO $pdo): never
{
    $body = readJsonBody();
    $identity = trim((string) ($body['nipd'] ?? ''));
    $type = strtoupper(trim((string) ($body['tipe'] ?? '')));
    if ($identity === '' || !in_array($type, ['DATANG', 'PULANG'], true)) {
        respondJson(['success' => false, 'message' => 'NIK/NIPD dan tipe DATANG atau PULANG wajib diisi.'], 400);
    }
    $query = $pdo->prepare(
        "SELECT * FROM PerangkatDesa
         WHERE REPLACE(UPPER(nipd), '-', '') = REPLACE(UPPER(?), '-', '') OR nik = ?
         LIMIT 1"
    );
    $query->execute([$identity, $identity]);
    $device = $query->fetch();
    if (!$device) {
        respondJson(['success' => false, 'message' => 'Perangkat dengan NIK/NIPD tersebut tidak ditemukan.'], 404);
    }

    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $local = $now->setTimezone(new DateTimeZone('Asia/Jakarta'));
    $dayStart = $local->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $dayEnd = $local->setTime(23, 59, 59, 999999)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    $duplicate = $pdo->prepare(
        'SELECT COUNT(*) FROM Absensi
         WHERE perangkatDesaId=? AND tipe=? AND tanggal BETWEEN ? AND ?'
    );
    $duplicate->execute([$device['id'], $type, $dayStart, $dayEnd]);
    if ((int) $duplicate->fetchColumn() > 0) {
        respondJson(['success' => false, 'message' => 'Absensi ' . strtolower($type) . ' perangkat ini sudah tercatat hari ini.'], 409);
    }

    $id = newId();
    $timestamp = $now->format('Y-m-d H:i:s.v');
    $gpsLat = nullableText($body, 'gpsLat', 64);
    $gpsLng = nullableText($body, 'gpsLng', 64);
    $gpsAccuracy = nullableText($body, 'gpsAccuracy', 64);
    $insert = $pdo->prepare(
        'INSERT INTO Absensi
            (id, perangkatDesaId, tipe, kategori, tanggal, waktu, gpsLat, gpsLng, gpsAccuracy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([
        $id, $device['id'], $type, $device['status'] === 'AKTIF' ? 'AKTIF' : 'PASIF',
        $timestamp, $local->format('H:i:s'), $gpsLat, $gpsLng, $gpsAccuracy, $timestamp, $timestamp,
    ]);
    $row = [
        'id' => $id,
        'perangkatDesaId' => $device['id'],
        'tipe' => $type,
        'kategori' => $device['status'] === 'AKTIF' ? 'AKTIF' : 'PASIF',
        'tanggal' => $timestamp,
        'waktu' => $local->format('H:i:s'),
        'gpsLat' => $gpsLat,
        'gpsLng' => $gpsLng,
        'gpsAccuracy' => $gpsAccuracy,
        'createdAt' => $timestamp,
        'updatedAt' => $timestamp,
        'perangkatId' => $device['id'],
        'nipd' => $device['nipd'],
        'namaLengkap' => $device['namaLengkap'],
        'nik' => $device['nik'],
        'tempatTanggalLahir' => $device['tempatTanggalLahir'],
        'jenisKelamin' => $device['jenisKelamin'],
        'pendidikanTerakhir' => $device['pendidikanTerakhir'],
        'nomorSK' => $device['nomorSK'],
        'jabatan' => $device['jabatan'],
        'kecamatan' => $device['kecamatan'],
        'desa' => $device['desa'],
        'status' => $device['status'],
        'keterangan' => $device['keterangan'],
        'perangkatCreatedAt' => $device['createdAt'],
        'perangkatUpdatedAt' => $device['updatedAt'],
    ];
    respondJson(['success' => true, 'data' => formatAttendance($row)], 201);
}

function dashboardData(PDO $pdo): never
{
    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta'));
    $start = $now->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $end = $now->setTime(23, 59, 59, 999999)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    $count = static function (PDO $pdo, string $sql, array $params = []): int {
        $query = $pdo->prepare($sql);
        $query->execute($params);
        return (int) $query->fetchColumn();
    };
    $total = $count($pdo, 'SELECT COUNT(*) FROM PerangkatDesa');
    $hadir = $count(
        $pdo,
        "SELECT COUNT(DISTINCT perangkatDesaId) FROM Absensi
         WHERE tipe='DATANG' AND tanggal BETWEEN ? AND ?",
        [$start, $end]
    );
    $pulang = $count(
        $pdo,
        "SELECT COUNT(DISTINCT perangkatDesaId) FROM Absensi
         WHERE tipe='PULANG' AND tanggal BETWEEN ? AND ?",
        [$start, $end]
    );
    $devices = deviceSelect($pdo);
    $recapQuery = $pdo->prepare(
        "SELECT SUM(tipe='DATANG') AS hadir, SUM(tipe='PULANG') AS pulang
         FROM Absensi WHERE perangkatDesaId=? AND tanggal >= ? AND tanggal <= ?"
    );
    $since = $now->modify('-29 days')->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $recap = [];
    foreach ($devices as $device) {
        $recapQuery->execute([$device['id'], $since, $end]);
        $counts = $recapQuery->fetch() ?: [];
        $recap[] = [
            'id' => $device['id'], 'nipd' => $device['nipd'],
            'namaLengkap' => $device['namaLengkap'], 'jabatan' => $device['jabatan'],
            'status' => $device['status'], 'hadir' => (int) ($counts['hadir'] ?? 0),
            'pulang' => (int) ($counts['pulang'] ?? 0),
        ];
    }
    $dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    $trend = [];
    for ($i = 6; $i >= 0; $i--) {
        $day = $now->modify("-{$i} days");
        $dayStart = $day->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $dayEnd = $day->setTime(23, 59, 59, 999999)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
        $trend[] = [
            'tanggal' => $day->format('Y-m-d'),
            'hari' => $dayNames[(int) $day->format('w')],
            'hadir' => $count(
                $pdo,
                "SELECT COUNT(DISTINCT perangkatDesaId) FROM Absensi
                 WHERE tipe='DATANG' AND tanggal BETWEEN ? AND ?",
                [$dayStart, $dayEnd]
            ),
        ];
    }
    $recent = $pdo->query(attendanceSelect() . ' ORDER BY a.createdAt DESC LIMIT 5')->fetchAll();
    $today = $pdo->prepare(attendanceSelect() . ' WHERE a.tanggal BETWEEN ? AND ? ORDER BY a.createdAt DESC');
    $today->execute([$start, $end]);
    $active = $count($pdo, "SELECT COUNT(*) FROM PerangkatDesa WHERE status='AKTIF'");
    $inactive = $count($pdo, "SELECT COUNT(*) FROM PerangkatDesa WHERE status='PASIF'");
    respondJson([
        'success' => true,
        'data' => [
            'totalPerangkat' => $total,
            'totalAktif' => $active,
            'totalPasif' => $inactive,
            'hadirHariIni' => $hadir,
            'pulangHariIni' => $pulang,
            'persentaseKehadiran' => $total ? round($hadir / $total * 100, 2) : 0,
            'rekap30Hari' => $recap,
            'tren7Hari' => $trend,
            'aktivitasTerbaru' => array_map('formatAttendance', $recent),
            'absensiHariIni' => array_map('formatAttendance', $today->fetchAll()),
        ],
    ]);
}

function xlsxColumnName(int $number): string
{
    $name = '';
    while ($number > 0) {
        $remainder = ($number - 1) % 26;
        $name = chr(65 + $remainder) . $name;
        $number = intdiv($number - 1, 26);
    }
    return $name;
}

function xmlText(string $value): string
{
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $value) ?? '';
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function xlsxCell(int $column, int $row, mixed $value, int $style = 0): string
{
    $reference = xlsxColumnName($column) . $row;
    $styleAttribute = $style > 0 ? ' s="' . $style . '"' : '';
    if (is_int($value) || is_float($value)) {
        return '<c r="' . $reference . '"' . $styleAttribute . '><v>' . $value . '</v></c>';
    }
    return '<c r="' . $reference . '" t="inlineStr"' . $styleAttribute . '><is><t xml:space="preserve">' .
        xmlText((string) ($value ?? '')) . '</t></is></c>';
}

function xlsxRow(int $row, array $cells): string
{
    ksort($cells);
    $xml = '';
    foreach ($cells as $column => $cell) {
        $xml .= xlsxCell((int) $column, $row, $cell[0], (int) ($cell[1] ?? 0));
    }
    return '<row r="' . $row . '">' . $xml . '</row>';
}

function xlsxStylesXml(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
        '<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font>' .
        '<font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font>' .
        '<font><b/><color rgb="FFC9A227"/><sz val="16"/><name val="Calibri"/></font>' .
        '<font><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font>' .
        '<font><b/><color rgb="FF17492C"/><sz val="11"/><name val="Calibri"/></font></fonts>' .
        '<fills count="8"><fill><patternFill patternType="none"/></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FF17492C"/><bgColor indexed="64"/></patternFill></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FF1E6339"/><bgColor indexed="64"/></patternFill></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FFDCEFE2"/><bgColor indexed="64"/></patternFill></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FFF7EFD4"/><bgColor indexed="64"/></patternFill></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FFFDECEA"/><bgColor indexed="64"/></patternFill></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FFE8E8E8"/><bgColor indexed="64"/></patternFill></fill>' .
        '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF8E8"/><bgColor indexed="64"/></patternFill></fill></fills>' .
        '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' .
        '<border><left style="thin"><color rgb="FF777777"/></left><right style="thin"><color rgb="FF777777"/></right>' .
        '<top style="thin"><color rgb="FF777777"/></top><bottom style="thin"><color rgb="FF777777"/></bottom><diagonal/></border></borders>' .
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' .
        '<cellXfs count="12">' .
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' .
        '<xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' .
        '<xf numFmtId="0" fontId="2" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' .
        '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' .
        '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' .
        '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' .
        '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' .
        '<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' .
        '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' .
        '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' .
        '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' .
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs>' .
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}

function xlsxWorksheetXml(
    string $sheetRows,
    array $merges = [],
    array $widths = [],
    int $freezeRows = 0,
    ?string $filter = null,
    ?string $printArea = null
): string {
    $cols = '';
    foreach ($widths as $column => $width) {
        $cols .= '<col min="' . $column . '" max="' . $column . '" width="' . $width . '" customWidth="1"/>';
    }
    $mergeXml = '';
    if ($merges) {
        $mergeXml = '<mergeCells count="' . count($merges) . '">';
        foreach ($merges as $merge) {
            $mergeXml .= '<mergeCell ref="' . $merge . '"/>';
        }
        $mergeXml .= '</mergeCells>';
    }
    $view = $freezeRows > 0
        ? '<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="' . $freezeRows .
            '" topLeftCell="A' . ($freezeRows + 1) . '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        : '<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>';
    $filterXml = $filter ? '<autoFilter ref="' . $filter . '"/>' : '';
    $printXml = $printArea
        ? '<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>'
        : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
        $view . '<sheetFormatPr defaultRowHeight="18"/>' .
        ($cols !== '' ? '<cols>' . $cols . '</cols>' : '') .
        '<sheetData>' . $sheetRows . '</sheetData>' . $filterXml . $mergeXml . $printXml . '</worksheet>';
}

function validateExportDates(string $from, string $to): void
{
    foreach (['from' => $from, 'to' => $to] as $key => $value) {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            respondJson(['success' => false, 'message' => "Parameter {$key} wajib berformat YYYY-MM-DD."], 400);
        }
    }
    if ($from > $to) {
        respondJson(['success' => false, 'message' => 'Tanggal awal tidak boleh setelah tanggal akhir.'], 400);
    }
}

function exportWorkbookData(PDO $pdo, string $from, string $to): array
{
    validateExportDates($from, $to);
    $fromUtc = (new DateTimeImmutable($from . ' 00:00:00', new DateTimeZone('Asia/Jakarta')))
        ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $toUtc = (new DateTimeImmutable($to . ' 23:59:59.999999', new DateTimeZone('Asia/Jakarta')))
        ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    $devices = $pdo->query('SELECT * FROM PerangkatDesa ORDER BY nipd ASC')->fetchAll();
    $query = $pdo->prepare(
        'SELECT a.*, p.nipd, p.namaLengkap, p.jabatan
         FROM Absensi a INNER JOIN PerangkatDesa p ON p.id=a.perangkatDesaId
         WHERE a.tanggal BETWEEN ? AND ? ORDER BY a.tanggal ASC'
    );
    $query->execute([$fromUtc, $toUtc]);
    $attendance = [];
    $history = [];
    foreach ($query->fetchAll() as $record) {
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
    return compact('from', 'to', 'devices', 'attendance', 'history');
}

function writeAttendanceWorkbook(PDO $pdo, string $from, string $to, string $filename): void
{
    if (!class_exists(ZipArchive::class)) {
        throw new RuntimeException('Ekspor XLSX memerlukan ekstensi PHP ZipArchive.');
    }
    $data = exportWorkbookData($pdo, $from, $to);
    $devices = $data['devices'];
    $attendance = $data['attendance'];
    $history = $data['history'];
    $month = new DateTimeImmutable(substr($from, 0, 7) . '-01', new DateTimeZone('Asia/Jakarta'));
    $year = (int) $month->format('Y');
    $monthNumber = (int) $month->format('n');
    $daysInMonth = (int) $month->format('t');
    $monthLastColumn = $daysInMonth + 6;
    $monthLastLetter = xlsxColumnName($monthLastColumn);
    $months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    $shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    $longDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    $summaryRows = '';
    $summaryMerges = ["A1:{$monthLastLetter}1", "A2:{$monthLastLetter}2", 'A3:C3', 'D3:G3', 'H3:K3', 'L3:O3'];
    $summaryRows .= xlsxRow(1, [1 => ['REKAP ABSENSI PERANGKAT DESA - ' . strtoupper($months[$monthNumber - 1]) . ' ' . $year, 2]]);
    $summaryRows .= xlsxRow(2, [1 => ['Pemerintah Desa Pekik Nyaring - Kec. Pondok Kelapa, Kab. Bengkulu Tengah', 3]]);
    $summaryRows .= xlsxRow(3, [
        1 => ['DP = Datang & Pulang', 4], 4 => ['D = Hanya Datang', 5],
        8 => ['Kosong = Tidak Absen', 6], 12 => ['Abu-abu = Akhir Pekan', 7],
    ]);
    $summaryMerges = array_merge($summaryMerges, ['A4:A5', 'B4:B5', 'C4:C5']);
    $summaryHeader = [
        1 => ['No', 1], 2 => ['Nama Perangkat Desa', 1], 3 => ['Jabatan', 1],
    ];
    $weekdayHeader = [];
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $column = 3 + $day;
        $date = $month->setDate($year, $monthNumber, $day);
        $summaryHeader[$column] = [$day, 1];
        $weekdayHeader[$column] = [$shortDays[(int) $date->format('w')], 1];
        $summaryMerges[] = xlsxColumnName($column) . '4:' . xlsxColumnName($column) . '5';
    }
    $presentColumn = $daysInMonth + 4;
    $completeColumn = $daysInMonth + 5;
    $absentColumn = $daysInMonth + 6;
    foreach ([
        $presentColumn => 'Hadir',
        $completeColumn => 'Lengkap D&P',
        $absentColumn => 'Tidak Hadir',
    ] as $column => $text) {
        $summaryHeader[$column] = [$text, 1];
        $summaryMerges[] = xlsxColumnName($column) . '4:' . xlsxColumnName($column) . '5';
    }
    $summaryRows .= xlsxRow(4, $summaryHeader) . xlsxRow(5, $weekdayHeader);
    $summaryWidths = [1 => 5, 2 => 30, 3 => 24, $presentColumn => 8, $completeColumn => 13, $absentColumn => 13];
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $summaryWidths[3 + $day] = 5;
    }
    $firstDay = max($from, $month->format('Y-m-d'));
    $lastDay = min($to, $month->setDate($year, $monthNumber, $daysInMonth)->format('Y-m-d'));
    $workingDaysInRange = 0;
    if ($firstDay <= $lastDay) {
        $cursor = new DateTimeImmutable($firstDay, new DateTimeZone('Asia/Jakarta'));
        while ($cursor->format('Y-m-d') <= $lastDay) {
            $workingDaysInRange += (int) $cursor->format('N') <= 5 ? 1 : 0;
            $cursor = $cursor->modify('+1 day');
        }
    }
    foreach ($devices as $index => $device) {
        $rowNumber = $index + 6;
        $cells = [1 => [$index + 1, 11], 2 => [$device['namaLengkap'], 11], 3 => [$device['jabatan'], 11]];
        $presentDays = 0;
        $completeDays = 0;
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = $month->setDate($year, $monthNumber, $day);
            $dateKey = $date->format('Y-m-d');
            $selected = $dateKey >= $from && $dateKey <= $to;
            $weekend = (int) $date->format('N') > 5;
            $types = $attendance[$device['id'] . '|' . $dateKey] ?? [];
            $value = !$selected ? '' : (
                isset($types['DATANG'], $types['PULANG']) ? 'DP' :
                (isset($types['DATANG']) ? 'D' : (isset($types['PULANG']) ? 'P' : ''))
            );
            $presentDays += $selected && $value !== '' ? 1 : 0;
            $completeDays += $selected && $value === 'DP' ? 1 : 0;
            $style = $weekend ? 7 : ($value === 'DP' ? 10 : ($value !== '' ? 9 : 8));
            $cells[3 + $day] = [$value, $style];
        }
        $cells[$presentColumn] = [$presentDays, 11];
        $cells[$completeColumn] = [$completeDays, 11];
        $cells[$absentColumn] = [max(0, $workingDaysInRange - $presentDays), 11];
        $summaryRows .= xlsxRow($rowNumber, $cells);
    }
    $dailyTitleRow = count($devices) + 7;
    $dailyHeaderRow = $dailyTitleRow + 1;
    $dailySubheaderRow = $dailyTitleRow + 2;
    $dailyFirstRow = $dailyTitleRow + 3;
    $summaryRows .= xlsxRow($dailyTitleRow, [1 => ['REKAP KEHADIRAN PER HARI', 3]]);
    $summaryMerges[] = "A{$dailyTitleRow}:{$monthLastLetter}{$dailyTitleRow}";
    $dailyHeaders = [
        1 => ['No', 1], 2 => ['Tanggal', 1], 3 => ['Hari', 1], 4 => ['Jumlah Perangkat', 1],
    ];
    $dailySubheaders = [4 => ['Hadir', 1], 5 => ['Lengkap D&P', 1]];
    $summaryMerges = array_merge($summaryMerges, [
        "A{$dailyHeaderRow}:A{$dailySubheaderRow}",
        "B{$dailyHeaderRow}:B{$dailySubheaderRow}",
        "C{$dailyHeaderRow}:C{$dailySubheaderRow}",
        "D{$dailyHeaderRow}:E{$dailyHeaderRow}",
    ]);
    $summaryRows .= xlsxRow($dailyHeaderRow, $dailyHeaders);
    $summaryRows .= xlsxRow($dailySubheaderRow, $dailySubheaders);
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
        $dailyStyle = (int) $date->format('N') > 5 ? 7 : 11;
        $summaryRows .= xlsxRow($rowNumber, [
            1 => [$day, $dailyStyle],
            2 => [$day . ' ' . $months[$monthNumber - 1] . ' ' . $year, $dailyStyle],
            3 => [$longDays[(int) $date->format('w')], $dailyStyle],
            4 => [$presentCount, $dailyStyle],
            5 => [$completeCount, $dailyStyle],
        ]);
    }
    $dailyLastRow = $dailyFirstRow + $daysInMonth - 1;
    $summaryWidths[1] = 5;
    $summaryWidths[2] = 24;
    $summaryWidths[3] = 14;
    $historyHeaders = [
        'No', 'Tanggal', 'NIPD', 'Nama', 'Jabatan', 'Status', 'Jam Datang',
        'Jam Pulang', 'Kategori', 'Metode', 'GPS Datang', 'GPS Pulang',
    ];
    $historyRows = xlsxRow(1, array_map(static fn ($value) => [$value, 1], array_combine(range(1, count($historyHeaders)), $historyHeaders)));
    $historyItems = array_values($history);
    usort($historyItems, static fn (array $left, array $right): int =>
        [$left['tanggal'], $left['nama']] <=> [$right['tanggal'], $right['nama']]
    );
    foreach ($historyItems as $index => $record) {
        $status = $record['datang'] !== null && $record['pulang'] !== null
            ? 'Hadir Lengkap'
            : ($record['datang'] !== null ? 'Hadir (Tanpa Pulang)' : 'Pulang Tanpa Datang');
        $values = [
            $index + 1, $record['tanggal'], $record['nipd'], $record['nama'], $record['jabatan'],
            $status, $record['datang'] ?? '-', $record['pulang'] ?? '-', $record['kategori'],
            'Absensi Aplikasi', $record['gpsDatang'] ?? '-', $record['gpsPulang'] ?? '-',
        ];
        $historyRows .= xlsxRow($index + 2, array_map(static fn ($value) => [$value, 11], array_combine(range(1, count($values)), $values)));
    }
    $historyWidths = [1 => 5, 2 => 14, 3 => 25, 4 => 28, 5 => 24, 6 => 24, 7 => 14, 8 => 14, 9 => 12, 10 => 20, 11 => 25, 12 => 25];
    $deviceHeaders = ['No', 'NIPD', 'Nama Lengkap', 'NIK', 'Jabatan', 'Jenis Kelamin', 'Pendidikan', 'Nomor SK', 'Status', 'Keterangan'];
    $deviceRows = xlsxRow(1, array_map(static fn ($value) => [$value, 1], array_combine(range(1, count($deviceHeaders)), $deviceHeaders)));
    foreach ($devices as $index => $device) {
        $values = [
            $index + 1, $device['nipd'], $device['namaLengkap'], $device['nik'] ?: '-',
            $device['jabatan'], $device['jenisKelamin'] ?: '-', $device['pendidikanTerakhir'] ?: '-',
            $device['nomorSK'] ?: '-', $device['status'], $device['keterangan'] ?: '-',
        ];
        $deviceRows .= xlsxRow($index + 2, array_map(static fn ($value) => [$value, 11], array_combine(range(1, count($values)), $values)));
    }
    $deviceWidths = [1 => 5, 2 => 25, 3 => 28, 4 => 20, 5 => 24, 6 => 16, 7 => 18, 8 => 14, 9 => 12, 10 => 36];
    $sheets = [
        'xl/worksheets/sheet1.xml' => xlsxWorksheetXml(
            $summaryRows, $summaryMerges, $summaryWidths, 5, null, "A1:{$monthLastLetter}{$dailyLastRow}"
        ),
        'xl/worksheets/sheet2.xml' => xlsxWorksheetXml(
            $historyRows, [], $historyWidths, 1, 'A1:L' . max(1, count($historyItems) + 1)
        ),
        'xl/worksheets/sheet3.xml' => xlsxWorksheetXml(
            $deviceRows, [], $deviceWidths, 1, 'A1:J' . max(1, count($devices) + 1)
        ),
    ];
    $sheetNames = ['Rekap Bulanan', 'Riwayat Absensi', 'Data Perangkat Desa'];
    $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
        '<Default Extension="xml" ContentType="application/xml"/>' .
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    for ($index = 1; $index <= 3; $index++) {
        $contentTypes .= '<Override PartName="/xl/worksheets/sheet' . $index .
            '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }
    $contentTypes .= '</Types>';
    $sheetsXml = '';
    $workbookRelations = '';
    foreach ($sheetNames as $index => $name) {
        $id = $index + 1;
        $sheetsXml .= '<sheet name="' . xmlText($name) . '" sheetId="' . $id . '" r:id="rId' . $id . '"/>';
        $workbookRelations .= '<Relationship Id="rId' . $id .
            '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' .
            $id . '.xml"/>';
    }
    $workbookRelations .= '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    $printArea = "'Rekap Bulanan'!" . '$A$1:$' . $monthLastLetter . '$' . $dailyLastRow;
    $files = [
        '[Content_Types].xml' => $contentTypes,
        '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
            '</Relationships>',
        'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' .
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<sheets>' . $sheetsXml . '</sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">' .
            xmlText($printArea) . '</definedName></definedNames></workbook>',
        'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            $workbookRelations . '</Relationships>',
        'xl/styles.xml' => xlsxStylesXml(),
    ];
    $zip = new ZipArchive();
    if ($zip->open($filename, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException('Tidak dapat membuat workbook XLSX.');
    }
    foreach ($files + $sheets as $name => $content) {
        if (!$zip->addFromString($name, $content)) {
            $zip->close();
            throw new RuntimeException('Tidak dapat menulis komponen ' . $name . ' pada workbook.');
        }
    }
    if (!$zip->close()) {
        throw new RuntimeException('Tidak dapat menyelesaikan workbook XLSX.');
    }
}

function xlsxExport(PDO $pdo): never
{
    $from = (string) ($_GET['from'] ?? '');
    $to = (string) ($_GET['to'] ?? '');
    validateExportDates($from, $to);
    if (!class_exists(ZipArchive::class)) {
        respondJson([
            'success' => false,
            'message' => 'Ekspor XLSX memerlukan ekstensi PHP ZipArchive. Unduh CSV dari tombol ekspor alternatif.',
        ], 503);
    }
    $dir = dirname(__DIR__) . '/runtime';
    if (!is_dir($dir) || !is_writable($dir)) {
        respondJson(['success' => false, 'message' => 'Folder runtime harus dapat ditulis untuk membuat ekspor sementara.'], 503);
    }
    $filename = tempnam($dir, 'absensi-');
    if ($filename === false) {
        respondJson(['success' => false, 'message' => 'Tidak dapat menyiapkan file ekspor sementara.'], 503);
    }
    try {
        writeAttendanceWorkbook($pdo, $from, $to, $filename);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="Rekap-Absensi-' . $from . '-sd-' . $to . '.xlsx"');
        header('Cache-Control: no-store, private');
        header('Content-Length: ' . filesize($filename));
        readfile($filename);
    } catch (Throwable $error) {
        error_log('XLSX export error: ' . $error->getMessage());
        @unlink($filename);
        respondJson(['success' => false, 'message' => 'Gagal membuat berkas XLSX. Gunakan ekspor CSV alternatif.'], 500);
    }
    @unlink($filename);
    exit;
}

function setupStatus(PDO $pdo): never
{
    $config = appConfig();
    if (tableExists($pdo, 'Admin')) {
        $adminExists = (int) $pdo->query('SELECT COUNT(*) FROM Admin')->fetchColumn() > 0;
        $locked = tableExists($pdo, 'AppMeta')
            && (string) $pdo->query("SELECT metaValue FROM AppMeta WHERE metaKey='setup_complete'")->fetchColumn() === '1';
        respondJson(['success' => true, 'setupRequired' => !$adminExists && !$locked]);
    }
    respondJson(['success' => true, 'setupRequired' => true]);
}

function firstRunSetup(PDO $pdo): never
{
    requireSameOrigin();
    $body = readJsonBody();
    $config = appConfig();
    $expectedToken = (string) $config['setup_token'];
    if (strlen($expectedToken) < 32 || stripos($expectedToken, 'GANTI_') !== false) {
        respondJson(['success' => false, 'message' => 'Atur token setup acak minimal 32 karakter di config.php sebelum memulai.'], 503);
    }
    $providedToken = (string) ($body['setupToken'] ?? '');
    if ($providedToken === '' || !hash_equals($expectedToken, $providedToken)) {
        respondJson(['success' => false, 'message' => 'Token setup tidak benar.'], 403);
    }
    $username = trim((string) ($body['username'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    if ($username === '' || mb_strlen($username) > 191) {
        respondJson(['success' => false, 'message' => 'Nama pengguna wajib diisi (maksimal 191 karakter).'], 400);
    }
    if (strlen($password) < 12 || strlen($password) > 4096) {
        respondJson(['success' => false, 'message' => 'Kata sandi admin minimal 12 karakter.'], 400);
    }

    $hasAdmin = tableExists($pdo, 'Admin')
        && (int) $pdo->query('SELECT COUNT(*) FROM Admin')->fetchColumn() > 0;
    $isComplete = tableExists($pdo, 'AppMeta')
        && (string) $pdo->query("SELECT metaValue FROM AppMeta WHERE metaKey='setup_complete'")->fetchColumn() === '1';
    if ($hasAdmin || $isComplete) {
        respondJson(['success' => false, 'message' => 'Setup sudah pernah diselesaikan dan tidak dapat digunakan lagi.'], 409);
    }

    createSchema($pdo);
    $pdo->beginTransaction();
    try {
        $pdo->exec(
            "INSERT INTO AppMeta (metaKey, metaValue) VALUES ('setup_lock', '1')
             ON DUPLICATE KEY UPDATE metaValue=VALUES(metaValue)"
        );
        $pdo->query("SELECT metaValue FROM AppMeta WHERE metaKey='setup_lock' FOR UPDATE")->fetch();
        $locked = $pdo->query("SELECT metaValue FROM AppMeta WHERE metaKey='setup_complete'")->fetchColumn();
        $hasAdmin = (int) $pdo->query('SELECT COUNT(*) FROM Admin')->fetchColumn() > 0;
        if ($hasAdmin || $locked === '1') {
            $pdo->rollBack();
            respondJson(['success' => false, 'message' => 'Setup sudah pernah diselesaikan dan tidak dapat digunakan lagi.'], 409);
        }
        $now = gmdate('Y-m-d H:i:s.v');
        $insert = $pdo->prepare(
            'INSERT INTO Admin (id, username, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
        );
        $insert->execute([newId(), $username, password_hash($password, PASSWORD_DEFAULT), $now, $now]);
        $meta = $pdo->prepare(
            "INSERT INTO AppMeta (metaKey, metaValue) VALUES ('setup_complete', '1')
             ON DUPLICATE KEY UPDATE metaValue='1'"
        );
        $meta->execute();
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
    respondJson(['success' => true, 'message' => 'Admin berhasil dibuat. Setup dikunci permanen; silakan masuk.']);
}

function clearAdminSession(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?: '/',
            'secure' => isHttpsRequest(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
    session_destroy();
}

if (PHP_SAPI !== 'cli') {
startAdminSession();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';

if ($path === '/api/auth/session' && $method === 'GET') {
    $admin = requireAdmin();
    respondJson(['success' => true, 'admin' => $admin, 'csrfToken' => newCsrfToken()]);
}
if ($path === '/api/auth/logout' && $method === 'POST') {
    requireAdmin();
    requireCsrf();
    clearAdminSession();
    respondJson(['success' => true]);
}
$publicRoutes = [
    'GET /api/auth/setup/status',
    'POST /api/auth/setup',
    'POST /api/auth/login',
];
if (!in_array($method . ' ' . $path, $publicRoutes, true)) {
    requireAdmin();
    if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        requireCsrf();
    }
}

try {
    $pdo = connectToDatabase();
    if ($path === '/api/auth/setup/status' && $method === 'GET') {
        setupStatus($pdo);
    }
    if ($path === '/api/auth/setup' && $method === 'POST') {
        firstRunSetup($pdo);
    }
    if ($path === '/api/auth/login' && $method === 'POST') {
        requireSameOrigin();
        if ((int) ($_SESSION['login_attempts'] ?? 0) >= 8
            && (time() - (int) ($_SESSION['login_window'] ?? time())) < 900) {
            respondJson(['success' => false, 'message' => 'Terlalu banyak percobaan masuk. Coba kembali 15 menit lagi.'], 429);
        }
        if (time() - (int) ($_SESSION['login_window'] ?? time()) >= 900) {
            $_SESSION['login_window'] = time();
            $_SESSION['login_attempts'] = 0;
        }
        $body = readJsonBody();
        $query = $pdo->prepare('SELECT id, username, password FROM Admin WHERE username=? LIMIT 1');
        $query->execute([trim((string) ($body['username'] ?? ''))]);
        $admin = $query->fetch();
        if (!$admin || !password_verify((string) ($body['password'] ?? ''), (string) $admin['password'])) {
            $_SESSION['login_attempts'] = (int) ($_SESSION['login_attempts'] ?? 0) + 1;
            $_SESSION['login_window'] ??= time();
            respondJson(['success' => false, 'message' => 'Username atau kata sandi salah.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (string) $admin['id'];
        $_SESSION['admin_username'] = (string) $admin['username'];
        $_SESSION['login_attempts'] = 0;
        respondJson([
            'success' => true,
            'admin' => ['id' => (string) $admin['id'], 'username' => (string) $admin['username']],
            'csrfToken' => newCsrfToken(),
        ]);
    }
    if ($path === '/api/perangkat' && $method === 'GET') {
        respondDeviceList($pdo);
    }
    if ($path === '/api/perangkat' && $method === 'POST') {
        saveDevice($pdo);
    }
    if (preg_match('#^/api/perangkat/([^/]+)$#', $path, $matches)) {
        $id = rawurldecode($matches[1]);
        if ($method === 'PUT') {
            editDevice($pdo, $id);
        }
        if ($method === 'DELETE') {
            deleteDevice($pdo, $id);
        }
    }
    if ($path === '/api/absensi' && $method === 'GET') {
        listAttendance($pdo);
    }
    if ($path === '/api/absensi' && $method === 'POST') {
        createAttendance($pdo);
    }
    if ($path === '/api/dashboard' && $method === 'GET') {
        dashboardData($pdo);
    }
    if ($path === '/api/absensi/export' && $method === 'GET') {
        xlsxExport($pdo);
    }
    respondJson(['success' => false, 'message' => 'Endpoint tidak ditemukan.'], 404);
} catch (Throwable $error) {
    error_log('InfinityFree attendance app error: ' . $error->getMessage());
    $message = 'Terjadi kesalahan server. Periksa konfigurasi database dan log hosting.';
    if (str_contains($error->getMessage(), 'Konfigurasi')) {
        $message = $error->getMessage();
    } elseif ($error instanceof PDOException) {
        $driverCode = (int) ($error->errorInfo[1] ?? 0);
        if (in_array($driverCode, [1044, 1045], true)) {
            $message = 'Database menolak akses. Periksa username, password, dan hak akses database pada config.php.';
        } elseif ($driverCode === 1049) {
            $message = 'Database tidak ditemukan. Cocokkan nama database lengkap dengan yang tertera di panel hosting.';
        } elseif (in_array($driverCode, [2002, 2003], true)) {
            $message = 'Server database tidak dapat dijangkau. Periksa host database di panel hosting.';
        } elseif (str_contains(strtolower($error->getMessage()), 'could not find driver')) {
            $message = 'Ekstensi PDO MySQL tidak aktif pada PHP hosting.';
        }
    }
    respondJson(['success' => false, 'message' => $message], 500);
}
}
