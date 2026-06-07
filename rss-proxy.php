<?php

declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

$feedUrl = trim((string) ($_GET['feed'] ?? ''));

if ($feedUrl === '') {
    respondWithError(400, 'Missing feed query parameter.');
}

if (!isAllowedFeedUrl($feedUrl)) {
    respondWithError(400, 'The feed URL must use http or https and resolve to a public host.');
}

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 10,
        'ignore_errors' => true,
        'header' => implode("\r\n", [
            'User-Agent: koodi0002-rss-mvp/1.0',
            'Accept: application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
        ]),
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
    ],
]);

$body = @file_get_contents($feedUrl, false, $context);
$responseHeaders = $http_response_header ?? [];
$statusCode = extractStatusCode($responseHeaders);

if ($body === false || $statusCode < 200 || $statusCode >= 300) {
    respondWithError(502, 'Failed to fetch the remote feed.');
}

if (strlen($body) > 2 * 1024 * 1024) {
    respondWithError(413, 'The fetched feed is too large for this MVP proxy.');
}

$contentType = findHeaderValue($responseHeaders, 'Content-Type') ?: 'application/xml; charset=UTF-8';

header('Content-Type: ' . $contentType);
echo $body;

function respondWithError(int $statusCode, string $message): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function extractStatusCode(array $headers): int
{
    $statusLine = $headers[0] ?? '';

    if (preg_match('/\s(\d{3})\s/', $statusLine, $matches) === 1) {
        return (int) $matches[1];
    }

    return 0;
}

function findHeaderValue(array $headers, string $headerName): string
{
    foreach ($headers as $header) {
        if (stripos($header, $headerName . ':') === 0) {
            return trim(substr($header, strlen($headerName) + 1));
        }
    }

    return '';
}

function isAllowedFeedUrl(string $url): bool
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        return false;
    }

    $parts = parse_url($url);
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));

    if (!in_array($scheme, ['http', 'https'], true) || $host === '') {
        return false;
    }

    if (isObviousLocalHostname($host)) {
        return false;
    }

    if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
        return isPublicIp($host);
    }

    $resolvedAnyRecord = false;
    $ipv4Addresses = gethostbynamel($host) ?: [];
    foreach ($ipv4Addresses as $ipAddress) {
        $resolvedAnyRecord = true;
        if (isPublicIp($ipAddress)) {
            return true;
        }
    }

    if (function_exists('dns_get_record')) {
        $ipv6Records = @dns_get_record($host, DNS_AAAA) ?: [];
        foreach ($ipv6Records as $record) {
            $ipAddress = (string) ($record['ipv6'] ?? '');
            if ($ipAddress !== '' && isPublicIp($ipAddress)) {
                return true;
            }
            if ($ipAddress !== '') {
                $resolvedAnyRecord = true;
            }
        }
    }

    return !$resolvedAnyRecord;
}

function isPublicIp(string $ipAddress): bool
{
    return filter_var(
        $ipAddress,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) !== false;
}

function isObviousLocalHostname(string $host): bool
{
    return $host === 'localhost'
        || str_ends_with($host, '.local')
        || str_ends_with($host, '.localdomain')
        || str_ends_with($host, '.internal')
        || str_ends_with($host, '.home.arpa');
}
