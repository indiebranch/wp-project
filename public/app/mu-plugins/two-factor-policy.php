<?php

/**
 * Plugin Name: Two Factor Policy
 * Description: Requires two-factor authentication for administrators and Multisite super administrators.
 * Author: IndieBranch
 * Author URI: https://indiebranch.com
 * License: MIT
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Require a second factor at login for administrators and Multisite super
 * administrators while preserving Two-Factor's requirement for all other users.
 *
 * This policy depends on Two-Factor being active and does not provide enrollment.
 * Administrators without a configured provider cannot log in, so they must
 * complete setup before enforcement is enabled. Set ENFORCE_TWO_FACTOR_POLICY
 * to false in .env during initial enrollment; enforcement defaults to enabled.
 */
add_filter(
    'two_factor_is_required_for_user',
    /**
     * Apply the administrator two-factor requirement.
     *
     * @param  bool    $is_required Whether Two-Factor already requires a challenge.
     * @param  WP_User $user        User being checked.
     * @return bool                 Whether a second factor is required.
     */
    static function (bool $is_required, WP_User $user): bool {
        // Disabling this policy must not bypass users' existing 2FA requirements.
        if (defined('ENFORCE_TWO_FACTOR_POLICY') && ENFORCE_TWO_FACTOR_POLICY === false) {
            return $is_required;
        }

        if (in_array('administrator', $user->roles, true)
            || (is_multisite() && is_super_admin($user->ID))) {
            return true;
        }

        // Preserve challenges for other users who have voluntarily enabled 2FA.
        return $is_required;
    },
    10,
    2,
);
