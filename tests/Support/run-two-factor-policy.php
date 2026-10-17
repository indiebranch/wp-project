<?php

// Only the WordPress user roles and filter registration are needed by this policy.
class WP_User
{
    public function __construct(public array $roles) {}
}

function add_filter(string $hook, callable $callback, int $priority = 10, int $accepted_args = 1): bool
{
    if ($hook === 'two_factor_is_required_for_user') {
        $GLOBALS['two_factor_policy'] = $callback;
    }

    return true;
}

[$enforce, $roles, $already_required] = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);

define('ABSPATH', dirname(__DIR__, 2) . '/public/wp/');

if ($enforce !== null) {
    define('ENFORCE_TWO_FACTOR_POLICY', $enforce);
}

require dirname(__DIR__, 2) . '/public/app/mu-plugins/two-factor-policy.php';

echo json_encode(
    $GLOBALS['two_factor_policy']($already_required, new WP_User($roles)),
    JSON_THROW_ON_ERROR,
);
