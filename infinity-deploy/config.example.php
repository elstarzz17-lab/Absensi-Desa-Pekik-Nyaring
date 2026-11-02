<?php
declare(strict_types=1);

/*
 * Salin file ini menjadi config.php di htdocs, lalu isi data yang diberikan
 * panel InfinityFree. Jangan pernah mengunggah config.php ke Git publik.
 */
return [
    'db_host' => 'sqlXXX.infinityfree.com',
    'db_name' => 'if0_XXXXXXXX_absensi',
    'db_user' => 'if0_XXXXXXXX',
    'db_password' => 'GANTI_DENGAN_PASSWORD_DATABASE',
    'setup_token' => 'GANTI_DENGAN_TOKEN_ACAK_MINIMAL_64_HEX',
];
