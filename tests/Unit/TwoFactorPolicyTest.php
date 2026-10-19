<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;

final class TwoFactorPolicyTest extends TestCase
{
    #[DataProvider('policyCases')]
    public function test_policy_respects_enforcement_and_existing_requirements(
        ?bool $enforce,
        array $roles,
        bool $already_required,
        bool $expected,
        bool $multisite = false,
        bool $super_admin = false,
    ): void {
        // Constants cannot be redefined, so evaluate each case in a fresh process.
        $process = new Process([
            PHP_BINARY,
            dirname(__DIR__) . '/Support/run-two-factor-policy.php',
            json_encode([$enforce, $roles, $already_required, $multisite, $super_admin], JSON_THROW_ON_ERROR),
        ]);
        $process->mustRun();

        self::assertSame($expected, json_decode($process->getOutput(), flags: JSON_THROW_ON_ERROR));
    }

    public static function policyCases(): iterable
    {
        yield 'requires administrator 2FA when enabled' => [true, ['administrator'], false, true];
        yield 'defaults to enforcing administrator 2FA' => [null, ['administrator'], false, true];
        yield 'allows administrator enrollment when disabled' => [false, ['administrator'], false, false];
        yield 'preserves administrator 2FA when disabled' => [false, ['administrator'], true, true];
        yield 'does not enforce enrollment for other roles' => [true, ['editor'], false, false];
        yield 'preserves voluntary 2FA for other roles' => [true, ['editor'], true, true];
        yield 'requires super-admin 2FA without a site role' => [true, [], false, true, true, true];
        yield 'requires super-admin 2FA with a non-admin site role' => [true, ['subscriber'], false, true, true, true];
        yield 'defaults to enforcing super-admin 2FA' => [null, [], false, true, true, true];
        yield 'allows super-admin enrollment when disabled' => [false, [], false, false, true, true];
        yield 'preserves super-admin 2FA when disabled' => [false, [], true, true, true, true];
        yield 'does not enforce 2FA for ordinary network users' => [true, ['editor'], false, false, true, false];
        yield 'preserves voluntary 2FA for ordinary network users' => [true, ['editor'], true, true, true, false];
        yield 'still requires site-admin 2FA in Multisite' => [true, ['administrator'], false, true, true, false];
    }
}
