<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/database.php';
require_once dirname(__DIR__) . '/nipd.php';

date_default_timezone_set('UTC');

function respondJson(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        respondJson(['success' => false, 'message' => 'Format permintaan tidak valid'], 400);
    }

    return $body;
}

function formatDevice(array $device): array
{
    foreach (['createdAt', 'updatedAt'] as $field) {
        $device[$field] = dateToIso($device[$field] ?? null);
    }

    return $device;
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
    unset(
        $row['perangkatId'],
        $row['nipd'],
        $row['namaLengkap'],
        $row['nik'],
        $row['tempatTanggalLahir'],
        $row['jenisKelamin'],
        $row['pendidikanTerakhir'],
        $row['nomorSK'],
        $row['jabatan'],
        $row['kecamatan'],
        $row['desa'],
        $row['status'],
        $row['keterangan'],
        $row['perangkatCreatedAt'],
        $row['perangkatUpdatedAt']
    );
    $row['tanggal'] = dateToIso($row['tanggal']);
    $row['createdAt'] = dateToIso($row['createdAt']);
    $row['updatedAt'] = dateToIso($row['updatedAt']);
    $row['perangkatDesa'] = $device;

    return $row;
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

function listPerangkat(PDO $pdo): never
{
    $rows = $pdo->query('SELECT * FROM PerangkatDesa ORDER BY nipd ASC')->fetchAll();
    respondJson(['success' => true, 'data' => array_map('formatDevice', $rows)]);
}

function savePerangkat(PDO $pdo): never
{
    $body = readJsonBody();
    $name = trim((string) ($body['namaLengkap'] ?? ''));
    $position = trim((string) ($body['jabatan'] ?? ''));
    if ($name === '' || $position === '') {
        respondJson(['success' => false, 'message' => 'Nama lengkap dan jabatan wajib diisi'], 400);
    }

    try {
        $nipd = generateNipd($body);
    } catch (InvalidArgumentException $error) {
        respondJson(['success' => false, 'message' => $error->getMessage()], 400);
    }
    $data = [
        'id' => newId(),
        'nipd' => $nipd,
        'namaLengkap' => $name,
        'nik' => ($body['nik'] ?? null) ?: null,
        'tempatTanggalLahir' => ($body['tempatTanggalLahir'] ?? null) ?: null,
        'jenisKelamin' => ($body['jenisKelamin'] ?? null) ?: null,
        'pendidikanTerakhir' => ($body['pendidikanTerakhir'] ?? null) ?: null,
        'nomorSK' => ($body['nomorSK'] ?? null) ?: null,
        'jabatan' => $position,
        'kecamatan' => ($body['kecamatan'] ?? null) ?: 'Pondok Kelapa',
        'desa' => ($body['desa'] ?? null) ?: 'Pekik Nyaring',
        'status' => ($body['status'] ?? null) ?: 'AKTIF',
        'keterangan' => ($body['keterangan'] ?? null) ?: null,
        'createdAt' => gmdate('Y-m-d H:i:s.v'),
        'updatedAt' => gmdate('Y-m-d H:i:s.v'),
    ];
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
    $statement->execute($data);
    $data['createdAt'] = dateToIso($data['createdAt']);
    $data['updatedAt'] = dateToIso($data['updatedAt']);

    respondJson(['success' => true, 'data' => $data], 201);
}

function editPerangkat(PDO $pdo, string $id): never
{
    $body = readJsonBody();
    $current = $pdo->prepare('SELECT id FROM PerangkatDesa WHERE id = ?');
    $current->execute([$id]);
    if (!$current->fetch()) {
        respondJson(['success' => false, 'message' => 'Perangkat desa tidak ditemukan'], 404);
    }

    $statement = $pdo->prepare(
        'UPDATE PerangkatDesa SET namaLengkap = :namaLengkap, nik = :nik,
            tempatTanggalLahir = :tempatTanggalLahir, jenisKelamin = :jenisKelamin,
            pendidikanTerakhir = :pendidikanTerakhir, nomorSK = :nomorSK,
            jabatan = :jabatan, kecamatan = :kecamatan, desa = :desa,
            status = :status, keterangan = :keterangan, updatedAt = :updatedAt
         WHERE id = :id'
    );
    $statement->execute([
        'id' => $id,
        'namaLengkap' => $body['namaLengkap'] ?? '',
        'nik' => ($body['nik'] ?? null) ?: null,
        'tempatTanggalLahir' => ($body['tempatTanggalLahir'] ?? null) ?: null,
        'jenisKelamin' => ($body['jenisKelamin'] ?? null) ?: null,
        'pendidikanTerakhir' => ($body['pendidikanTerakhir'] ?? null) ?: null,
        'nomorSK' => ($body['nomorSK'] ?? null) ?: null,
        'jabatan' => $body['jabatan'] ?? '',
        'kecamatan' => $body['kecamatan'] ?? 'Pondok Kelapa',
        'desa' => $body['desa'] ?? 'Pekik Nyaring',
        'status' => $body['status'] ?? 'AKTIF',
        'keterangan' => ($body['keterangan'] ?? null) ?: null,
        'updatedAt' => gmdate('Y-m-d H:i:s.v'),
    ]);
    $check = $pdo->prepare('SELECT * FROM PerangkatDesa WHERE id = ?');
    $check->execute([$id]);
    $device = $check->fetch();
    if (!$device) {
        respondJson(['success' => false, 'message' => 'Perangkat desa tidak ditemukan'], 404);
    }

    respondJson(['success' => true, 'data' => formatDevice($device)]);
}

function deletePerangkat(PDO $pdo, string $id): never
{
    $statement = $pdo->prepare('DELETE FROM PerangkatDesa WHERE id = ?');
    $statement->execute([$id]);
    if ($statement->rowCount() === 0) {
        respondJson(['success' => false, 'message' => 'Perangkat desa tidak ditemukan'], 404);
    }

    respondJson(['success' => true, 'message' => 'Perangkat desa berhasil dihapus']);
}

function listAbsensi(PDO $pdo): never
{
    $conditions = [];
    $parameters = [];
    foreach (['from' => '00:00:00', 'to' => '23:59:59.999'] as $key => $time) {
        $value = $_GET[$key] ?? null;
        if ($value !== null && $value !== '') {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            if (!$date || $date->format('Y-m-d') !== $value) {
                respondJson(['success' => false, 'message' => "Tanggal {$key} tidak valid"], 400);
            }
            $conditions[] = 'a.tanggal ' . ($key === 'from' ? '>=' : '<=') . ' :' . $key;
            $parameters[$key] = $value . ' ' . $time;
        }
    }
    $search = trim((string) ($_GET['search'] ?? ''));
    if ($search !== '') {
        $conditions[] = '(p.namaLengkap LIKE :searchName OR p.nipd LIKE :searchNipd)';
        $parameters['searchName'] = '%' . $search . '%';
        $parameters['searchNipd'] = '%' . $search . '%';
    }

    $query = attendanceSelect();
    if ($conditions) {
        $query .= ' WHERE ' . implode(' AND ', $conditions);
    }
    $query .= ' ORDER BY a.createdAt DESC';
    $statement = $pdo->prepare($query);
    $statement->execute($parameters);
    $rows = array_map('formatAttendance', $statement->fetchAll());

    respondJson(['success' => true, 'data' => $rows]);
}

function createAbsensi(PDO $pdo): never
{
    $body = readJsonBody();
    $identity = trim((string) ($body['nipd'] ?? ''));
    $type = $body['tipe'] ?? '';
    if ($identity === '' || $type === '') {
        respondJson(['success' => false, 'message' => 'NIPD/NIK dan tipe wajib diisi'], 400);
    }
    if (!in_array($type, ['DATANG', 'PULANG'], true)) {
        respondJson(['success' => false, 'message' => 'Tipe harus DATANG atau PULANG'], 400);
    }

    $statement = $pdo->prepare('SELECT * FROM PerangkatDesa WHERE nipd = :nipd LIMIT 1');
    $statement->execute(['nipd' => $identity]);
    $device = $statement->fetch();
    if (!$device) {
        $statement = $pdo->prepare('SELECT * FROM PerangkatDesa WHERE nik = :nik LIMIT 1');
        $statement->execute(['nik' => $identity]);
        $device = $statement->fetch();
    }
    if (!$device) {
        respondJson([
            'success' => false,
            'message' => "Perangkat desa dengan NIPD/NIK \"{$identity}\" tidak ditemukan",
        ], 404);
    }

    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $localTime = $now->setTimezone(new DateTimeZone('Asia/Jakarta'));
    $attendance = [
        'id' => newId(),
        'perangkatDesaId' => $device['id'],
        'tipe' => $type,
        'kategori' => $device['status'] === 'AKTIF' ? 'AKTIF' : 'PASIF',
        'tanggal' => $now->format('Y-m-d H:i:s.v'),
        'waktu' => $localTime->format('H:i:s'),
        'gpsLat' => isset($body['gpsLat']) && $body['gpsLat'] !== '' ? (string) $body['gpsLat'] : null,
        'gpsLng' => isset($body['gpsLng']) && $body['gpsLng'] !== '' ? (string) $body['gpsLng'] : null,
        'gpsAccuracy' => isset($body['gpsAccuracy']) && $body['gpsAccuracy'] !== '' ? (string) $body['gpsAccuracy'] : null,
        'createdAt' => $now->format('Y-m-d H:i:s.v'),
        'updatedAt' => $now->format('Y-m-d H:i:s.v'),
    ];
    $statement = $pdo->prepare(
        'INSERT INTO Absensi
            (id, perangkatDesaId, tipe, kategori, tanggal, waktu, gpsLat, gpsLng,
             gpsAccuracy, createdAt, updatedAt)
         VALUES
            (:id, :perangkatDesaId, :tipe, :kategori, :tanggal, :waktu, :gpsLat,
             :gpsLng, :gpsAccuracy, :createdAt, :updatedAt)'
    );
    $statement->execute($attendance);
    $row = $attendance + [
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
    $todayStart = $now->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $todayEnd = $now->setTime(23, 59, 59, 999999)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    $count = static function (PDO $pdo, string $sql, array $parameters = []): int {
        $statement = $pdo->prepare($sql);
        $statement->execute($parameters);
        return (int) $statement->fetchColumn();
    };

    $total = $count($pdo, 'SELECT COUNT(*) FROM PerangkatDesa');
    $active = $count($pdo, "SELECT COUNT(*) FROM PerangkatDesa WHERE status = 'AKTIF'");
    $inactive = $count($pdo, "SELECT COUNT(*) FROM PerangkatDesa WHERE status = 'PASIF'");
    $hadir = $count(
        $pdo,
        "SELECT COUNT(DISTINCT perangkatDesaId) FROM Absensi
         WHERE tipe = 'DATANG' AND tanggal BETWEEN :start AND :end",
        ['start' => $todayStart, 'end' => $todayEnd]
    );
    $pulang = $count(
        $pdo,
        "SELECT COUNT(DISTINCT perangkatDesaId) FROM Absensi
         WHERE tipe = 'PULANG' AND tanggal BETWEEN :start AND :end",
        ['start' => $todayStart, 'end' => $todayEnd]
    );

    $periodStart = $now->modify('-30 days')->setTime(0, 0)
        ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $devices = $pdo->query('SELECT * FROM PerangkatDesa ORDER BY nipd ASC')->fetchAll();
    $recapQuery = $pdo->prepare(
        "SELECT
            SUM(CASE WHEN tipe = 'DATANG' THEN 1 ELSE 0 END) AS hadir,
            SUM(CASE WHEN tipe = 'PULANG' THEN 1 ELSE 0 END) AS pulang
         FROM Absensi WHERE perangkatDesaId = :id AND tanggal BETWEEN :start AND :end"
    );
    $recap = [];
    foreach ($devices as $device) {
        $recapQuery->execute([
            'id' => $device['id'],
            'start' => $periodStart,
            'end' => $todayEnd,
        ]);
        $counts = $recapQuery->fetch();
        $recap[] = [
            'id' => $device['id'],
            'nipd' => $device['nipd'],
            'namaLengkap' => $device['namaLengkap'],
            'jabatan' => $device['jabatan'],
            'status' => $device['status'],
            'hadir' => (int) ($counts['hadir'] ?? 0),
            'pulang' => (int) ($counts['pulang'] ?? 0),
        ];
    }

    $dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    $trend = [];
    for ($i = 6; $i >= 0; $i--) {
        $day = $now->modify("-{$i} days");
        $start = $day->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $end = $day->setTime(23, 59, 59, 999999)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
        $present = $count(
            $pdo,
            "SELECT COUNT(DISTINCT perangkatDesaId) FROM Absensi
             WHERE tipe = 'DATANG' AND tanggal BETWEEN :start AND :end",
            ['start' => $start, 'end' => $end]
        );
        $trend[] = [
            'tanggal' => $day->format('Y-m-d'),
            'hari' => $dayNames[(int) $day->format('w')],
            'hadir' => $present,
        ];
    }

    $activityQuery = $pdo->query(attendanceSelect() . ' ORDER BY a.createdAt DESC LIMIT 5');
    $todayQuery = $pdo->prepare(
        attendanceSelect() . ' WHERE a.tanggal BETWEEN :start AND :end ORDER BY a.createdAt DESC'
    );
    $todayQuery->execute(['start' => $todayStart, 'end' => $todayEnd]);

    respondJson([
        'success' => true,
        'data' => [
            'totalPerangkat' => $total,
            'totalAktif' => $active,
            'totalPasif' => $inactive,
            'hadirHariIni' => $hadir,
            'pulangHariIni' => $pulang,
            'persentaseKehadiran' => $total > 0 ? round(($hadir / $total) * 100, 2) : 0,
            'rekap30Hari' => $recap,
            'tren7Hari' => $trend,
            'aktivitasTerbaru' => array_map('formatAttendance', $activityQuery->fetchAll()),
            'absensiHariIni' => array_map('formatAttendance', $todayQuery->fetchAll()),
        ],
    ]);
}

function exportAbsensi(PDO $pdo): never
{
    require_once dirname(__DIR__) . '/export.php';
    exportAttendanceWorkbook($pdo, (string) ($_GET['from'] ?? ''), (string) ($_GET['to'] ?? ''));
}

try {
    $pdo = connectToDatabase();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');

    if ($path === '/api/auth/setup' && $method === 'POST') {
        $admin = $pdo->query('SELECT id, username FROM Admin ORDER BY createdAt ASC LIMIT 1')->fetch();
        if (!$admin) {
            respondJson([
                'success' => false,
                'message' => 'Admin belum tersedia. Jalankan migrasi atau buat admin melalui prosedur setup CLI.',
            ], 409);
        }
        respondJson(['success' => true, 'message' => 'Admin sudah ada', 'admin' => $admin]);
    }

    if ($path === '/api/auth/login' && $method === 'POST') {
        $body = readJsonBody();
        $statement = $pdo->prepare('SELECT id, username, password FROM Admin WHERE username = ? LIMIT 1');
        $statement->execute([trim((string) ($body['username'] ?? ''))]);
        $admin = $statement->fetch();
        if (!$admin || !password_verify((string) ($body['password'] ?? ''), $admin['password'])) {
            respondJson(['success' => false, 'message' => 'Username atau kata sandi salah'], 401);
        }
        respondJson([
            'success' => true,
            'admin' => ['id' => $admin['id'], 'username' => $admin['username']],
        ]);
    }

    if ($path === '/api/perangkat' && $method === 'GET') {
        listPerangkat($pdo);
    }
    if ($path === '/api/perangkat' && $method === 'POST') {
        savePerangkat($pdo);
    }
    if (preg_match('#^/api/perangkat/([^/]+)$#', $path, $matches)) {
        $id = rawurldecode($matches[1]);
        if ($method === 'PUT') {
            editPerangkat($pdo, $id);
        }
        if ($method === 'DELETE') {
            deletePerangkat($pdo, $id);
        }
    }
    if ($path === '/api/absensi' && $method === 'GET') {
        listAbsensi($pdo);
    }
    if ($path === '/api/absensi' && $method === 'POST') {
        createAbsensi($pdo);
    }
    if ($path === '/api/dashboard' && $method === 'GET') {
        dashboardData($pdo);
    }
    if ($path === '/api/absensi/export' && $method === 'GET') {
        exportAbsensi($pdo);
    }

    respondJson(['success' => false, 'message' => 'Endpoint tidak ditemukan'], 404);
} catch (Throwable $error) {
    error_log('PHP API error: ' . $error->getMessage());
    respondJson(['success' => false, 'message' => 'Terjadi kesalahan server'], 500);
}
