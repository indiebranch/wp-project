# Built branches

Successful CI for `main` or `develop` can publish a ready-to-deploy Git branch:

| Source | Output | Composer dependencies |
| --- | --- | --- |
| `main` | `main--built` | Production only |
| `develop` | `develop--built` | Includes development dependencies |

RunCloud can read these branches through its normal Git integration. The workflows
do not deploy to a server or run database migrations.

## GitHub App setup

Create a GitHub App under the account/organization that owns your repositories:

1. Give it a recognizable name, such as IndieBranch Automation, and a homepage URL.
2. No OAuth callback or running webhook server is needed. Disable the webhook's
   **Active** setting.
3. Grant repository permissions:
   - **Contents: Read and write** for merging and publishing commits.
   - **Pull requests: Read and write** for dependency approvals and auto-merge.
   - **Workflows: Read and write** for dependency updates that change workflow files.
   - Metadata read access is automatic.
4. Install the App on the repositories that will use this automation.
5. Record its numeric **App ID** and generate a private key.

For each repository, configure:

| Kind | Name | Value |
| --- | --- | --- |
| Actions repository variable | `AUTOMATION_APP_ID` | Numeric App ID, not the Client ID |
| Actions secret | `AUTOMATION_APP_PRIVATE_KEY` | Complete generated PEM private key |
| Actions repository variable | `BUILD_ENABLED` | `true` to enable builds |

Also add the same private key as a Dependabot secret with the same name so it is
available in Dependabot-triggered contexts. The key is used to obtain short-lived,
repository-scoped tokens; the App does not need a hosted service.

Keep source-branch protection and required CI checks enabled. Do not give the App
a bypass of these requirements. Generated `--built` branches must permit the App's
direct pushes, without requiring a PR or CI workflows on those generated branches.

The existing `DEPENDABOT_AUTO_MERGE=true` setting enables dependency automation.
Once the App is configured, eligible PRs receive an App approval and are marked for
squash auto-merge. Required checks still govern merging. Without an App, the existing
token-based auto-merge remains available but does not supply automatic approval or
the reliable merge-to-build event chain.

## Build flow

1. `CI` validates PHP and, when root package.json exists, runs `npm ci` and the root
   workspace build. Push checks run on `main` and `develop`.
2. `Build` accepts successful push or manually dispatched CI runs for those branches
   in this repository. PR CI runs cannot publish a release.
3. A read-only job checks out the exact tested SHA and invokes `bin/build-release`.
4. Composer installs root dependencies with optimized autoloading. Root Composer
   scripts are disabled during release preparation; Composer installers remain enabled.
5. If root package.json exists, `npm ci` and `npm run build` compile the assets.
   Development npm dependencies are required for compilation on both branches.
6. `.deployignore` controls which files enter a tar artifact, preserving permissions.
7. A separate job obtains an App token and publishes to the corresponding built
   branch. Publishing jobs are serialized per source branch, and source-tip checks
   skip outdated builds. Existing built-branch history is retained without force pushes.

The App key is only used for publication, not during dependency installation or builds.
Every release contains `build-info.json` with its source branch and commit.

## Output

The release includes WordPress, installed plugins/themes, the root vendor directory,
custom PHP source, compiled assets, Composer metadata, and license files. Local
configuration, credentials, uploads, node_modules, and project test/tooling files
are excluded. Review `.deployignore` when adding runtime directories.

The source .gitignore is replaced by one copied from `.deployignore`, keeping
server-local credentials and uploads ignored in the built branch too. Hosting must
still preserve those files when switching releases.

The staging release includes Composer development dependencies, matching the source
branch policy above. That includes both developer plugins and PHP QA packages.
Production omits them. Runtime plugin vendor directories are retained because
third-party plugins may need them.

Custom theme/plugin source and asset manifests must be committed in derived projects.
The independently mounted sandbox repositories and its ignored root npm manifests
are not available to GitHub's clean checkout. The blank template can build without
them. Nested PHP dependencies belong in root Composer; no nested installs are run.

## First run

Merge the workflow files, configure the App and enable `BUILD_ENABLED`. In GitHub
Actions, manually run **CI** against `main`. A successful run triggers **Build**.
Inspect `main--built`, its `build-info.json`, and the release artifact before pointing
a server at it. Repeat against `develop` once that branch exists.

With `BUILD_ENABLED=true` but no App ID, release preparation still produces an
artifact for inspection and publication is skipped. Once the App is installed,
test an actual Dependabot merge and confirm it triggers CI followed by Build.

Use GitHub Actions failure notifications to monitor builds. Built branches do not
change runtime settings or preserve server uploads themselves; configure those
persistent files in the hosting deployment process.
