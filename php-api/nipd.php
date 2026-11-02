<?php
declare(strict_types=1);

function birthDateFromDevice(array $device): ?DateTimeImmutable
{
    $birthPlaceDate = trim((string) ($device['tempatTanggalLahir'] ?? ''));
    if ($birthPlaceDate !== '' && $birthPlaceDate !== '-') {
        if (preg_match('/(?<!\d)(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?!\d)/', $birthPlaceDate, $matches)) {
            $day = (int) $matches[1];
            $month = (int) $matches[2];
            $year = (int) $matches[3];
            if (checkdate($month, $day, $year)) {
                return new DateTimeImmutable(
                    sprintf('%04d-%02d-%02d', $year, $month, $day),
                    new DateTimeZone('Asia/Jakarta')
                );
            }
        }
    }

    $nik = preg_replace('/\D/', '', (string) ($device['nik'] ?? ''));
    if (strlen($nik) !== 16) {
        return null;
    }

    $encodedDay = (int) substr($nik, 6, 2);
    $day = $encodedDay > 40 ? $encodedDay - 40 : $encodedDay;
    $month = (int) substr($nik, 8, 2);
    $shortYear = (int) substr($nik, 10, 2);
    $currentYear = (int) (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y');
    $year = $shortYear <= $currentYear % 100
        ? 2000 + $shortYear
        : 1900 + $shortYear;
    if (!checkdate($month, $day, $year)) {
        return null;
    }

    return new DateTimeImmutable(
        sprintf('%04d-%02d-%02d', $year, $month, $day),
        new DateTimeZone('Asia/Jakarta')
    );
}

function generateNipd(array $device): string
{
    $name = trim((string) ($device['namaLengkap'] ?? ''));
    preg_match_all('/[\p{L}\p{N}]+/u', $name, $nameParts);
    $nameCode = '';
    foreach (array_slice($nameParts[0] ?? [], 0, 3) as $part) {
        $nameCode .= mb_strtoupper(mb_substr($part, 0, 1));
    }
    if ($nameCode === '') {
        throw new InvalidArgumentException('Nama lengkap diperlukan untuk membentuk NIPD.');
    }

    $birthDate = birthDateFromDevice($device);
    if ($birthDate === null) {
        throw new InvalidArgumentException('Tanggal lahir yang valid diperlukan untuk membentuk NIPD.');
    }

    $today = new DateTimeImmutable('today', new DateTimeZone('Asia/Jakarta'));
    if ($birthDate > $today) {
        throw new InvalidArgumentException('Tanggal lahir tidak boleh melebihi tanggal hari ini.');
    }

    $age = $birthDate->diff($today)->y;
    return sprintf(
        'NIPD-%s-%d@%s-%s',
        $nameCode,
        $age,
        $birthDate->format('dmY'),
        strtoupper(bin2hex(random_bytes(2)))
    );
}
