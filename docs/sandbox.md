# Using wp-project as a sandbox

Use your local wp-project installation to develop the theme and plugin starters.
Each starter stays in its own sibling repository, mounted into DDEV.

## 1. Clone the starters

Arrange the repositories on your host:

```text
Sites/
  wp-project/
  wp-theme/
  wp-plugin/
```

If they are not already cloned, run these from wp-project on your host:

```bash
git clone git@github.com:indiebranch/wp-theme.git ../wp-theme
git clone git@github.com:indiebranch/wp-plugin.git ../wp-plugin
```

The theme and plugin files should live at their respective repository roots.

## Automated setup

After completing the normal project installation and cloning the sibling repositories,
run this from wp-project on your host:

```bash
ddev sandbox setup
```

The host command adds local Git exclusions, creates the sandbox Compose override if
missing, restarts DDEV, and installs the root Composer dependencies and autoloader. It adds
starters with build scripts to the local npm workspaces, installs npm dependencies,
and builds assets. PHP-only starters are not added as npm workspaces.

Existing Compose configuration, npm scripts, and unrelated package fields are
preserved. Repeating setup does not duplicate workspace paths or Git exclusions.
It does not create WordPress users or change the active theme/plugins.

The sections below describe the local files and manual setup steps.

## 2. Exclude the local mounts from Git

On your host, add these entries to wp-project's `.git/info/exclude`:

```gitignore
# Local sandbox mounts
/.ddev/docker-compose.sandbox.yaml
/public/app/themes/wp-theme/
/public/app/plugins/wp-plugin/
/package.json
/package-lock.json
```

These exclusions belong to your checkout. The starters retain their own Git histories.

## 3. Configure DDEV mounts

Create `.ddev/docker-compose.sandbox.yaml` in wp-project:

```yaml
services:
  web:
    volumes:
      - "${DDEV_APPROOT}/../wp-theme:/var/www/html/public/app/themes/wp-theme"
      - "${DDEV_APPROOT}/../wp-plugin:/var/www/html/public/app/plugins/wp-plugin"
```

Keep the existing Bedrock DDEV configuration, with `public` as the document root.
Edits inside the container update the sibling repositories directly.

## 4. Restart and verify

From wp-project on your host:

```bash
ddev restart
ddev exec git -C public/app/themes/wp-theme rev-parse --show-toplevel
ddev exec git -C public/app/plugins/wp-plugin rev-parse --show-toplevel
git status --short
```

Each Git command should identify its mounted starter directory. The sandbox override
and mounted files should not appear as additions in wp-project's Git status.

Once valid theme and plugin files exist, activate them:

```bash
ddev wp theme activate wp-theme
ddev wp plugin activate wp-plugin
```

Empty repositories are not yet recognized by WordPress.

## 5. Work inside the container

Enter DDEV:

```bash
ddev ssh
```

For theme work:

```bash
cd /var/www/html/public/app/themes/wp-theme
```

For plugin work:

```bash
cd /var/www/html/public/app/plugins/wp-plugin
```

Run Git commands from the corresponding repository. In the sandbox, install PHP
dependencies at the project root; the root autoloader supplies the starters' classes.

## PHP autoloading

The root composer.json maps `IndieBranch\Theme\` and `IndieBranch\WpPlugin\` to
the mounted starters' `src/` directories. Bedrock loads `vendor/autoload.php` before
WordPress loads the theme and plugins, so one root installation is sufficient:

```bash
ddev composer install
```

After changing namespace mappings, run `ddev composer dump-autoload`.
The root also maps the plugin test namespace. Run its unit tests with the project's
tools:

```bash
ddev exec vendor/bin/pest public/app/plugins/wp-plugin/tests
```

Nested composer.json files are not automatically merged. Any PHP library needed
by project-owned code must be in the root `require` section. In a derived project,
update the namespace/path mappings for its custom code, include that source in Git,
and add its source and test paths to the project's analysis and test configuration.
Deploy the root `vendor/` with the project; nested vendor directories are unnecessary.

For standalone plugin development outside Bedrock, install dependencies inside the
plugin instead. The plugin falls back to that local autoloader when the project
has not supplied its classes. The theme retains explicit file loading as its
standalone fallback.

## 6. Build from the project root

The theme has its own package.json and wp-scripts dependency. Create a local
package.json in wp-project to coordinate the mounted starter:

```json
{
  "name": "wp-project",
  "private": true,
  "workspaces": ["public/app/themes/wp-theme"],
  "scripts": {
    "build": "npm run build --workspaces",
    "start:theme": "npm run start --workspace @indiebranch/wp-theme"
  }
}
```

From wp-project on your host:

```bash
ddev npm install
ddev npm run build
```

Use `ddev npm ci` for subsequent clean installations and `ddev npm run start:theme`
to watch theme assets. npm maintains one lock file at the project root. The root
manifests are local sandbox configuration and are excluded above; the theme's own
package.json belongs to its repository.

In a derived project with its own custom theme and plugins, commit the root
manifests and list that project's asset-bearing packages as explicit workspaces.
PHP-only plugins do not need a workspace. Avoid wildcard workspace paths that could
include Composer-installed packages.

List each asset-bearing theme or plugin explicitly, for example:

```json
"workspaces": [
  "public/app/themes/project-theme",
  "public/app/plugins/project-plugin"
]
```

Every listed workspace must provide a `build` script. The root command runs each
build and fails if a build fails or its script is missing. Workspace builds run
sequentially; one build should not depend on another workspace's generated output.
