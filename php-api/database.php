<?php
declare(strict_types=1);

function databaseConfig(): array
{
    return [
        'host' => getenv('ABSENSI_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('ABSENSI_DB_PORT') ?: '3306',
        'name' => getenv('ABSENSI_DB_NAME') ?: 'absensi_pekik_nyaring',
        'user' => getenv('ABSENSI_DB_USER') ?: 'root',
        'password' => getenv('ABSENSI_DB_PASSWORD') ?: '',
    ];
}

function connectToMySql(bool $selectDatabase = true): PDO
{
    $config = databaseConfig();
    if (!preg_match('/^[A-Za-z0-9_]+$/', $config['name'])) {
        throw new RuntimeException('Nama database tidak valid.');
    }

    $database = $selectDatabase ? ';dbname=' . $config['name'] : '';
    $pdo = new PDO(
        "mysql:host={$config['host']};port={$config['port']}{$database};charset=utf8mb4",
        $config['user'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $pdo->exec("SET time_zone = '+00:00'");

    return $pdo;
}

function connectToDatabase(): PDO
{
    static $connection;
    if (!$connection instanceof PDO) {
        $connection = connectToMySql();
    }

    return $connection;
}

function createSchema(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS Admin (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            username VARCHAR(191) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS PerangkatDesa (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            nipd VARCHAR(64) NOT NULL UNIQUE,
            namaLengkap VARCHAR(191) NOT NULL,
            nik VARCHAR(32) NULL,
            tempatTanggalLahir VARCHAR(191) NULL,
            jenisKelamin VARCHAR(32) NULL,
            pendidikanTerakhir VARCHAR(100) NULL,
            nomorSK VARCHAR(100) NULL,
            jabatan VARCHAR(191) NOT NULL,
            kecamatan VARCHAR(191) NOT NULL DEFAULT 'Pondok Kelapa',
            desa VARCHAR(191) NOT NULL DEFAULT 'Pekik Nyaring',
            status VARCHAR(32) NOT NULL DEFAULT 'AKTIF',
            keterangan TEXT NULL,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL,
            INDEX PerangkatDesa_namaLengkap_idx (namaLengkap),
            INDEX PerangkatDesa_nik_idx (nik)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS Absensi (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            perangkatDesaId VARCHAR(64) NOT NULL,
            tipe VARCHAR(32) NOT NULL,
            kategori VARCHAR(32) NOT NULL,
            tanggal DATETIME(3) NOT NULL,
            waktu VARCHAR(32) NOT NULL,
            gpsLat VARCHAR(64) NULL,
            gpsLng VARCHAR(64) NULL,
            gpsAccuracy VARCHAR(64) NULL,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL,
            INDEX Absensi_tanggal_idx (tanggal),
            INDEX Absensi_perangkatDesaId_tanggal_idx (perangkatDesaId, tanggal),
            CONSTRAINT Absensi_perangkatDesaId_fkey
                FOREIGN KEY (perangkatDesaId) REFERENCES PerangkatDesa(id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function newId(): string
{
    return bin2hex(random_bytes(16));
}

function mysqlDateTime(mixed $value): string
{
    if (is_numeric($value)) {
        $seconds = ((float) $value) / 1000;
        $date = DateTimeImmutable::createFromFormat(
            'U.u',
            sprintf('%.6F', $seconds),
            new DateTimeZone('UTC')
        );
        if ($date === false) {
            throw new RuntimeException('Format tanggal dari database lama tidak valid.');
        }
    } else {
        $date = new DateTimeImmutable((string) $value, new DateTimeZone('UTC'));
    }

    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
}

function dateToIso(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    return (new DateTimeImmutable((string) $value, new DateTimeZone('UTC')))
        ->setTimezone(new DateTimeZone('UTC'))
        ->format('Y-m-d\TH:i:s.v\Z');
}

function importSqliteDatabase(PDO $mysql, string $sqlitePath): array
{
    if (!is_file($sqlitePath)) {
        return ['admin' => 0, 'perangkat' => 0, 'absensi' => 0];
    }

    $sqlite = new PDO('sqlite:' . $sqlitePath, options: [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $imported = ['admin' => 0, 'perangkat' => 0, 'absensi' => 0];
    $mysql->beginTransaction();

    try {
        foreach ($sqlite->query('SELECT * FROM Admin') as $row) {
            $passwordInfo = password_get_info((string) $row['password']);
            $password = $passwordInfo['algo'] === null
                ? password_hash((string) $row['password'], PASSWORD_DEFAULT)
                : (string) $row['password'];
            $statement = $mysql->prepare(
                'INSERT INTO Admin (id, username, password, createdAt, updatedAt)
                 VALUES (:id, :username, :password, :createdAt, :updatedAt)
                 ON DUPLICATE KEY UPDATE username = VALUES(username),
                    password = VALUES(password), createdAt = VALUES(createdAt),
                    updatedAt = VALUES(updatedAt)'
            );
            $statement->execute([
                'id' => $row['id'],
                'username' => $row['username'],
                'password' => $password,
                'createdAt' => mysqlDateTime($row['createdAt']),
                'updatedAt' => mysqlDateTime($row['updatedAt']),
            ]);
            $imported['admin']++;
        }

        foreach ($sqlite->query('SELECT * FROM PerangkatDesa') as $row) {
            $statement = $mysql->prepare(
                'INSERT INTO PerangkatDesa
                    (id, nipd, namaLengkap, nik, tempatTanggalLahir, jenisKelamin,
                     pendidikanTerakhir, nomorSK, jabatan, kecamatan, desa, status,
                     keterangan, createdAt, updatedAt)
                 VALUES
                    (:id, :nipd, :namaLengkap, :nik, :tempatTanggalLahir, :jenisKelamin,
                     :pendidikanTerakhir, :nomorSK, :jabatan, :kecamatan, :desa, :status,
                     :keterangan, :createdAt, :updatedAt)
                 ON DUPLICATE KEY UPDATE nipd = VALUES(nipd),
                    namaLengkap = VALUES(namaLengkap), nik = VALUES(nik),
                    tempatTanggalLahir = VALUES(tempatTanggalLahir),
                    jenisKelamin = VALUES(jenisKelamin),
                    pendidikanTerakhir = VALUES(pendidikanTerakhir),
                    nomorSK = VALUES(nomorSK), jabatan = VALUES(jabatan),
                    kecamatan = VALUES(kecamatan), desa = VALUES(desa),
                    status = VALUES(status), keterangan = VALUES(keterangan),
                    createdAt = VALUES(createdAt), updatedAt = VALUES(updatedAt)'
            );
            $row['createdAt'] = mysqlDateTime($row['createdAt']);
            $row['updatedAt'] = mysqlDateTime($row['updatedAt']);
            $statement->execute($row);
            $imported['perangkat']++;
        }

        foreach ($sqlite->query('SELECT * FROM Absensi') as $row) {
            $statement = $mysql->prepare(
                'INSERT INTO Absensi
                    (id, perangkatDesaId, tipe, kategori, tanggal, waktu,
                     gpsLat, gpsLng, gpsAccuracy, createdAt, updatedAt)
                 VALUES
                    (:id, :perangkatDesaId, :tipe, :kategori, :tanggal, :waktu,
                     :gpsLat, :gpsLng, :gpsAccuracy, :createdAt, :updatedAt)
                 ON DUPLICATE KEY UPDATE perangkatDesaId = VALUES(perangkatDesaId),
                    tipe = VALUES(tipe), kategori = VALUES(kategori),
                    tanggal = VALUES(tanggal), waktu = VALUES(waktu),
                    gpsLat = VALUES(gpsLat), gpsLng = VALUES(gpsLng),
                    gpsAccuracy = VALUES(gpsAccuracy), createdAt = VALUES(createdAt),
                    updatedAt = VALUES(updatedAt)'
            );
            $row['tanggal'] = mysqlDateTime($row['tanggal']);
            $row['createdAt'] = mysqlDateTime($row['createdAt']);
            $row['updatedAt'] = mysqlDateTime($row['updatedAt']);
            $statement->execute($row);
            $imported['absensi']++;
        }

        $mysql->commit();
    } catch (Throwable $error) {
        if ($mysql->inTransaction()) {
            $mysql->rollBack();
        }
        throw $error;
    }

    return $imported;
}
