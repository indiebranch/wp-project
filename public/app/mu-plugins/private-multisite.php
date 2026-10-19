<?php

/**
 * Plugin Name: Private Multisite
 * Description: Restricts Multisite registration to network administrators to mitigate CVE-2017-14990 (plaintext signup activation keys).
 * Author: IndieBranch
 * Author URI: https://indiebranch.com
 * License: MIT
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

if (! is_multisite()) {
    return;
}

// Avoid the signup/activation workflow affected by CVE-2017-14990. This does not
// fix core's plaintext key storage or invalidate existing pending signups.
// See docs/multisite.md for the advisory acceptance and conversion checks.
// Keep self-service registration closed, including before options are persisted.
add_filter('pre_site_option_registration', static fn(): string => 'none');

// Network administrators can still create users through Network Admin or WP-CLI.
add_filter('site_option_add_new_users', '__return_false');
add_filter('default_site_option_add_new_users', '__return_false');
