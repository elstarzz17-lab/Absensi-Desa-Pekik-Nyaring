<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$username = trim((string) getenv('ABSENSI_ADMIN_USERNAME'));
$password = (string) getenv('ABSENSI_ADMIN_PASSWORD');
if ($username === '' || strlen($password) < 12) {
    fwrite(STDERR, "Atur ABSENSI_ADMIN_USERNAME dan ABSENSI_ADMIN_PASSWORD (minimal 12 karakter) sebelum menjalankan perintah.\n");
    exit(1);
}

try {
    $pdo = connectToDatabase();
    $now = gmdate('Y-m-d H:i:s.v');
    $statement = $pdo->prepare(
        'INSERT INTO Admin (id, username, password, createdAt, updatedAt)
         VALUES (:id, :username, :password, :createdAt, :updatedAt)
         ON DUPLICATE KEY UPDATE password = VALUES(password), updatedAt = VALUES(updatedAt)'
    );
    $statement->execute([
        'id' => newId(),
        'username' => $username,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'createdAt' => $now,
        'updatedAt' => $now,
    ]);
    fwrite(STDOUT, "Akun admin siap untuk username: {$username}\n");
} catch (Throwable $error) {
    fwrite(STDERR, "Pembuatan admin gagal: {$error->getMessage()}\n");
    exit(1);
}
