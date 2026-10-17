<?php

/**
 * Plugin Name: Update Notifications
 * Description: Shows plugin and theme update notices when dashboard file modifications are disabled.
 * Author: Felix Arntz, IndieBranch
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 *
 * Adapted from Felix Arntz:
 * https://github.com/felixarntz/felixarntz-mu-plugins/blob/main/felixarntz-mu-plugins/show-update-notifications-with-disallow-file-mods.php
 *
 * Modified 2026-10-17 by IndieBranch to share plugin and theme handling.
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Restore native update notices; WordPress omits update links when permission is denied.
 */
foreach (['plugins' => 'plugin', 'themes' => 'theme'] as $screen => $type) {
    add_action(
        "load-{$screen}.php",
        static function () use ($screen, $type): void {
            if (! defined('DISALLOW_FILE_MODS') || ! DISALLOW_FILE_MODS) {
                return;
            }

            // Core already registers these rows when updates are permitted.
            if (current_user_can("update_{$screen}")) {
                return;
            }

            $updates = get_site_transient("update_{$screen}");

            if (! isset($updates->response) || ! is_array($updates->response)) {
                return;
            }

            foreach (array_keys($updates->response) as $file) {
                add_action("after_{$type}_row_{$file}", "wp_{$type}_update_row", 10, 2);
            }
        },
        20,
    );
}
