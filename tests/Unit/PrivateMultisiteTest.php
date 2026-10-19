<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;

final class PrivateMultisiteTest extends TestCase
{
    #[DataProvider('registrationCases')]
    public function test_registration_policy(bool $multisite, string $hook, mixed $stored, mixed $expected): void
    {
        $process = new Process([
            PHP_BINARY,
            dirname(__DIR__) . '/Support/run-private-multisite.php',
            json_encode([$multisite, $hook, $stored], JSON_THROW_ON_ERROR),
        ]);
        $process->mustRun();

        self::assertSame($expected, json_decode($process->getOutput(), flags: JSON_THROW_ON_ERROR));
    }

    public static function registrationCases(): iterable
    {
        yield 'single-site registration unchanged' => [false, 'pre_site_option_registration', false, false];
        yield 'single-site user creation unchanged' => [false, 'site_option_add_new_users', true, true];
        yield 'blocks user signup' => [true, 'pre_site_option_registration', 'user', 'none'];
        yield 'blocks site signup' => [true, 'pre_site_option_registration', 'blog', 'none'];
        yield 'blocks both signup types' => [true, 'pre_site_option_registration', 'all', 'none'];
        yield 'blocks signup with no stored setting' => [true, 'pre_site_option_registration', false, 'none'];
        yield 'blocks site-admin user registration' => [true, 'site_option_add_new_users', true, false];
        yield 'blocks default site-admin user registration' => [true, 'default_site_option_add_new_users', true, false];
    }
}
