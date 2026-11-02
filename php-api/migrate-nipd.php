<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/nipd.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

try {
    $pdo = connectToDatabase();
    $devices = $pdo->query(
        'SELECT id, nipd, namaLengkap, nik, tempatTanggalLahir
         FROM PerangkatDesa ORDER BY nipd ASC'
    )->fetchAll();
    $updated = 0;
    $skipped = [];
    $pdo->beginTransaction();
    $update = $pdo->prepare(
        'UPDATE PerangkatDesa SET nipd = :nipd, updatedAt = :updatedAt WHERE id = :id'
    );

    foreach ($devices as $device) {
        if (birthDateFromDevice($device) === null) {
            $skipped[] = $device['id'];
            continue;
        }
        $update->execute([
            'id' => $device['id'],
            'nipd' => generateNipd($device),
            'updatedAt' => gmdate('Y-m-d H:i:s.v'),
        ]);
        $updated++;
    }

    $pdo->commit();
    fwrite(STDOUT, "NIPD diperbarui: {$updated} perangkat.\n");
    if ($skipped) {
        fwrite(STDOUT, count($skipped) . " perangkat dilewati karena tanggal lahir tidak tersedia/valid.\n");
    }
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Migrasi NIPD gagal: {$error->getMessage()}\n");
    exit(1);
}
