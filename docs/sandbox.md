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
missing, restarts DDEV, and installs root and starter Composer dependencies. It adds
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

Run Git commands and component-specific build commands from the corresponding repository.

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
