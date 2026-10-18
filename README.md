# wp-project

A reusable WordPress project starter by IndieBranch, based on [Roots Bedrock](https://roots.io/bedrock/). Uses Composer for dependency management, environment-based configuration, and `public/` as the document root.

## Requirements

- [DDEV](https://ddev.com/) and a supported Docker provider for the recommended local setup.
- Git.

DDEV provides PHP, Composer, a database, and WP-CLI. PHP 8.5 is recommended for the current dependency lock file. Without DDEV, provide these tools yourself and configure your web server to serve `public/`, not the repository root.

## Getting started

### Clone the repository

```bash
git clone https://github.com/indiebranch/wp-project.git
cd wp-project
```

### Configure the environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and site URL. For DDEV, use:

```dotenv
DB_HOST='db'
DB_NAME='db'
DB_USER='db'
DB_PASSWORD='db'
WP_ENV='development'
WP_ENVIRONMENT_TYPE='local'
```

Generate fresh values at [Roots Salts](https://roots.io/salts.html) and replace all eight authentication key/salt placeholders. Keep `.env` out of version control.

### Start the local environment

If `.ddev/config.yaml` is not present, configure DDEV first:

```bash
ddev config --project-type=wp-bedrock --docroot=public --php-version=8.5
```

Start DDEV and install the locked dependencies:

```bash
ddev start
ddev composer install
ddev describe
```

Set `WP_HOME` in `.env` to the HTTPS project URL shown by `ddev describe`. Keep `WP_SITEURL` as `"${WP_HOME}/wp"`.

### Install WordPress

Open the WordPress installer and follow the setup steps:

```bash
ddev launch /wp/wp-admin/install.php
```

The site is served at `WP_HOME`; the admin area is at `WP_HOME/wp/wp-admin/`.

## Development

To develop the reusable theme and plugin starters in this installation, follow the
[sandbox setup](docs/sandbox.md).

### Common commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `ddev start` | Start the local environment |
| `ddev stop` | Stop the local environment |
| `ddev launch` | Open the site |
| `ddev composer install` | Install dependencies from `composer.lock` |
| `ddev composer ci` | Run Composer validation, security audit, PHP checks, and tests |
| `ddev composer lint:syntax` | Check PHP syntax with Parallel Lint |
| `ddev composer lint` | Check PHP formatting with Pint |
| `ddev composer lint:fix` | Apply PHP formatting fixes |
| `ddev composer analyse` | Run WordPress-aware PHPStan static analysis |
| `ddev composer test` | Run the Pest test suite |
| `ddev wp plugin list` | List installed WordPress plugins |

Outside DDEV, use `composer` and `wp` directly.

### Continuous integration

GitHub Actions runs the checks on pull requests and pushes to `main`, using PHP 8.5
to match DDEV. It also verifies a production dependency installation with `--no-dev`.

Composer's security audit includes WordPress advisories from
[WP Sec Adv](https://github.com/typisttech/wpsecadv), sourced from Wordfence.

The `Dependency audit` workflow also checks the default branch's lock file daily
at 03:00 UTC and can be run manually from GitHub Actions. Unignored advisories
fail the workflow. Enable Actions failure notifications in your GitHub notification
settings; this workflow reports findings without changing dependencies.

Static analysis checks `config/` and project-owned mu-plugins at PHPStan level 6.
WordPress APIs are supplied by stubs; analysis does not load WordPress or require a
database. Add custom theme paths to `phpstan.neon.dist` when introducing a theme or plugin.

To run the checks locally:

```bash
ddev composer install
ddev composer ci
```

### Dependency auto-merge

Auto-merge is opt-in for each repository. First protect `main` with required pull
requests and the `PHP checks` status check, enable squash merging and **Allow
auto-merge**, then set the Actions repository variable `DEPENDABOT_AUTO_MERGE` to
`true`. Required human approvals still need to be supplied.

Verified Dependabot patch, minor, and major updates are eligible, including grouped
updates. Composer PRs may only modify the root `composer.json` and/or `composer.lock`;
GitHub Actions PRs may only modify workflow YAML files in `.github/workflows/`.
GitHub's required checks and approvals gate merging; the workflow does not approve
PRs or bypass branch rules.

### Managing plugins and themes

Manage third-party plugins and themes through Composer so installations can be reproduced. Packages are available through [WP Packages](https://wp-packages.org/).

For example:

```bash
ddev composer require wp-plugin/query-monitor
```

Commit both `composer.json` and `composer.lock` when dependencies change. WordPress core, installed plugins, and the bundled Twenty Twenty-Five theme are excluded from Git. Add ignore rules for any additional Composer-managed themes; commit your own custom theme source.

## Project structure

```text
config/              Application and environment-specific configuration
public/              Web server document root
  app/               WordPress content directory
    mu-plugins/      Must-use plugins and Bedrock autoloader
    plugins/         Composer-installed plugins
    themes/          Installed and custom themes
    uploads/         Uploaded media, excluded from Git
  wp/                Composer-installed WordPress core
tests/               Automated tests
vendor/              Composer dependencies, excluded from Git
.env.example         Environment variable template
composer.json        Project metadata, dependencies, and scripts
composer.lock        Locked dependency versions
```

The `public/` directory replaces Bedrock's default `web/` directory.

## Configuration

Use `.env` for installation-specific values. See [`.env.example`](.env.example) for variable descriptions. Shared application settings live in `config/application.php`.

### Environment settings

- `WP_ENV` selects overrides from `config/environments/{WP_ENV}.php`. Use `development` for local development, `staging` for staging, and `production` for production. Production uses the base application configuration.
- `WP_ENVIRONMENT_TYPE` tells WordPress and plugins what kind of environment is running. Use `local` for local development; otherwise match `WP_ENV`. If omitted, it defaults to `WP_ENV` for supported values.

For local development, keep `WP_ENV='development'` and `WP_ENVIRONMENT_TYPE='local'`. There is no `local.php` configuration file.

### Debugging and scheduled tasks

With `WP_ENV='development'`, `config/environments/development.php` enables `WP_DEBUG` and defaults `WP_DEBUG_LOG` to `true`. Set `WP_DEBUG_LOG=false` in `.env` to disable logging, or provide an absolute log file path. `WP_DEBUG` itself is configured in PHP, not read from `.env`.

Request-triggered WordPress cron is enabled by default. Set `DISABLE_WP_CRON=true` only when an external scheduler runs WordPress cron.

## License and attribution

Maintained by Nomad Labs Ltd trading as IndieBranch.

Based on [Roots Bedrock](https://github.com/roots/bedrock) by Roots Software LLC.

Licensed under MIT, except where otherwise noted. See [LICENSE.md](LICENSE.md).
WordPress and installed plugins and themes retain their own licenses.

See the [Bedrock documentation](https://roots.io/bedrock/docs/) for further details on the underlying configuration and architecture.
