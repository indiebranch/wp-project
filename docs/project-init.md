# Initialize a derived project

Use GitHub's template feature to create a new repository from wp-project, then clone
the new repository. Run this on your host from the checkout root:

```bash
ddev project init acme-website
```

Use a lowercase name starting with a letter, with hyphens between words. The command
reads the new GitHub repository from `origin`. For other clone arrangements, provide
the metadata repository explicitly:

```bash
ddev project init acme-website --repository indiebranch/acme-website
```

This does not change Git remotes. Use a fresh derived checkout, not the canonical
wp-project development checkout.

## Changes

- DDEV project name.
- Composer name (`indiebranch/<name>`), description, homepage, and support links.
- Root npm name and lock-file root name, when those files exist.
- README title, clone instructions, and starter-only sections.
- Removal of the sandbox command, npm helper, mount override, and sandbox guide.
- Removal of the local exclusions created by sandbox setup.
- Composer lock metadata refreshed without installing or upgrading dependencies.
- After success, removal of the initializer command, helper, tests, and this guide.

Licensing, attribution, automation workflows, custom source, Git history, and
unrelated metadata remain. No theme/plugin repositories are copied or renamed, and
mounted directories are never deleted. Configure their namespaces, paths, and Git
ignore exceptions when adding project-owned components later.

The initializer uses the DDEV container for Node and Composer, so no host Node/PHP
installation is needed. It gives DDEV a unique name before starting that environment.
If a sandbox override was present, it restarts DDEV after removing it. Existing `.env`
contents and permissions are preserved, and a startup-generated `.env` is removed
if none existed before initialization. Local environment setup remains a separate
README step.
Initialize before introducing a shared/symlinked `.env`; that arrangement is rejected
without changing it.

If initialization fails before its final cleanup, the initializer remains available.
Retrying with the same name preserves the initialized metadata and retries the lock
refresh. A different name is rejected. After success the command removes itself;
CI skips the initializer-specific checks when those files are absent.

The template's metadata and cleanup tests run in CI without DDEV or a database.
They are removed from initialized projects. Inside DDEV, run
them with `node --test tests/Tooling/*.test.mjs`. Test the full host command only in
a disposable derived checkout, because it renames that checkout's DDEV project.

## After initialization

Review `git diff` and commit the identity/cleanup changes:

```text
chore: initialize acme-website project
```

Then follow the README to configure `.env`, install dependencies, and install
WordPress. Configure repository rules, App access, and automation variables for
the new repository; those settings are not inherited from the template.
