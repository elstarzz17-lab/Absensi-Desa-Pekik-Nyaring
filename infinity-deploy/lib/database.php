<?php
declare(strict_types=1);

function appConfig(): array
{
    $path = dirname(__DIR__) . '/config.php';
    if (!is_file($path)) {
        throw new RuntimeException('Konfigurasi belum dibuat. Salin config.example.php menjadi config.php dan isi data database hosting.');
    }

    $config = require $path;
    if (!is_array($config)) {
        throw new RuntimeException('Format config.php tidak valid.');
    }

    foreach (['db_host', 'db_name', 'db_user', 'db_password', 'setup_token'] as $key) {
        if (!array_key_exists($key, $config) || !is_string($config[$key])) {
            throw new RuntimeException('Konfigurasi database tidak lengkap.');
        }
    }
    if ($config['db_host'] === '' || $config['db_name'] === '' || $config['db_user'] === '') {
        throw new RuntimeException('Host, nama database, dan user database wajib diisi.');
    }
    if (!preg_match('/^[A-Za-z0-9_]+$/', $config['db_name'])) {
        throw new RuntimeException('Nama database dari panel hosting tidak valid.');
    }

    return $config;
}

function connectToDatabase(): PDO
{
    static $connection;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $config = appConfig();
    $connection = new PDO(
        'mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=utf8mb4',
        $config['db_user'],
        $config['db_password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $connection->exec("SET time_zone = '+00:00'");

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
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS AppMeta (
            metaKey VARCHAR(64) NOT NULL PRIMARY KEY,
            metaValue TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function newId(): string
{
    return bin2hex(random_bytes(16));
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

function tableExists(PDO $pdo, string $table): bool
{
    $statement = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?'
    );
    $statement->execute([$table]);
    return (int) $statement->fetchColumn() > 0;
}
