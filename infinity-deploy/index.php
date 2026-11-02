<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header(
    "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " .
    "img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; " .
    "font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/lib/api.php';
    exit;
}
if (str_starts_with($path, '/assets/')) {
    $asset = realpath(__DIR__ . $path);
    $assetDirectory = realpath(__DIR__ . '/assets');
    if ($asset !== false && $assetDirectory !== false
        && str_starts_with($asset, $assetDirectory . DIRECTORY_SEPARATOR)
        && is_file($asset)) {
        return false;
    }
}

?><!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#173b2b">
  <title>Absensi Pekik Nyaring</title>
  <link rel="stylesheet" href="assets/app.css">
  <script defer src="assets/qrcode.min.js"></script>
  <script defer src="assets/app.js"></script>
</head>
<body>
  <div id="app" class="app-shell">
    <main class="boot-screen"><span class="brand-mark">PN</span><p>Menyiapkan aplikasi absensi…</p></main>
  </div>
</body>
</html>
