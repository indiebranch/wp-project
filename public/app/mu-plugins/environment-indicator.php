<?php

/**
 * Plugin Name: Environment Indicator
 * Description: Displays the current WordPress environment beside the toolbar account menu.
 * Author: IndieBranch
 * Author URI: https://indiebranch.com
 * License: MIT
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

add_action(
    'admin_bar_menu',
    /**
     * Add a color-coded label to the toolbar's account-side group.
     *
     * @param WP_Admin_Bar $admin_bar Toolbar instance.
     */
    static function (WP_Admin_Bar $admin_bar): void {
        // Use WordPress's classification, not Bedrock's configuration profile.
        $environment = wp_get_environment_type();
        $colors = [
            'local' => '#166534',
            'development' => '#1e40af',
            'staging' => '#854d0e',
            'production' => '#991b1b',
        ];

        $admin_bar->add_node([
            'id' => 'indiebranch-environment',
            'parent' => 'top-secondary',
            'title' => sprintf(
                '<span style="background-color: %s; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600;">%s</span>',
                esc_attr($colors[$environment] ?? $colors['production']),
                esc_html(ucfirst($environment)),
            ),
            'meta' => [
                'title' => sprintf('WordPress environment: %s', $environment),
            ],
        ]);
    },
    100,
);
