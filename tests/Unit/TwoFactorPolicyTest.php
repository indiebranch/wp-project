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
    ): void {
        // Constants cannot be redefined, so evaluate each case in a fresh process.
        $process = new Process([
            PHP_BINARY,
            dirname(__DIR__) . '/Support/run-two-factor-policy.php',
            json_encode([$enforce, $roles, $already_required], JSON_THROW_ON_ERROR),
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
    }
}
