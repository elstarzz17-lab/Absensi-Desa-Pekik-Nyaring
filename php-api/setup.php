<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

try {
    $config = databaseConfig();
    $server = connectToMySql(false);
    $databaseName = $config['name'];
    $server->exec(
        "CREATE DATABASE IF NOT EXISTS `{$databaseName}`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );

    $database = connectToDatabase();
    createSchema($database);

    $sqlitePath = getenv('SQLITE_MIGRATION_PATH')
        ?: dirname(__DIR__) . DIRECTORY_SEPARATOR . 'db' . DIRECTORY_SEPARATOR . 'custom.db';
    $imported = importSqliteDatabase($database, $sqlitePath);

    fwrite(STDOUT, "Database siap: {$databaseName}\n");
    fwrite(STDOUT, "Data yang diproses: {$imported['admin']} admin, {$imported['perangkat']} perangkat, {$imported['absensi']} absensi.\n");
    if (array_sum($imported) === 0) {
        fwrite(STDOUT, "Tidak ada database SQLite sumber untuk dimigrasikan.\n");
    }
} catch (Throwable $error) {
    fwrite(STDERR, "Setup database gagal: {$error->getMessage()}\n");
    exit(1);
}
