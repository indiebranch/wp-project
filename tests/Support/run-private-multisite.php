<?php

[$multisite, $hook, $stored] = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
$GLOBALS['private_multisite_filters'] = [];

function is_multisite(): bool
{
    global $multisite;

    return $multisite;
}

function add_filter(string $hook, callable $callback): bool
{
    $GLOBALS['private_multisite_filters'][$hook] = $callback;

    return true;
}

function __return_false(): bool
{
    return false;
}

define('ABSPATH', dirname(__DIR__, 2) . '/public/wp/');
require dirname(__DIR__, 2) . '/public/app/mu-plugins/private-multisite.php';

$callback = $GLOBALS['private_multisite_filters'][$hook] ?? null;
echo json_encode($callback ? $callback($stored) : $stored, JSON_THROW_ON_ERROR);
