import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = fileURLToPath(new URL('../../.ddev/scripts/project-init.mjs', import.meta.url));
const sandboxFiles = ['.ddev/commands/host/sandbox', '.ddev/scripts/sandbox-workspaces.mjs', '.ddev/docker-compose.sandbox.yaml', 'docs/sandbox.md'];

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wp-project-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  write('composer.json', JSON.stringify({ name: 'indiebranch/wp-project', require: { php: '>=8.3' }, custom: 'preserve' }));
  write('.ddev/config.yaml', 'name: wp-project\ntype: wp-bedrock\ndocroot: public\n');
  write('README.md', '# wp-project\n\nA reusable WordPress project starter by IndieBranch.\n\n### Clone\n\ngit clone https://github.com/indiebranch/wp-project.git\ncd wp-project\n\n### Initialize a new project\n\nTemplate instructions.\n\n### Configure the environment\n\nKeep these instructions.\n\nTo develop the reusable theme and plugin starters in this installation, follow the\n[sandbox setup](docs/sandbox.md).\n\n## Attribution\n\nRoots Software LLC.\n');
  for (const path of sandboxFiles) write(path, 'sandbox-only');
  return {
    root,
    write,
    read: (path) => readFileSync(join(root, path), 'utf8'),
    has: (path) => existsSync(join(root, path)),
    run: (name = 'acme-site', repository = 'indiebranch/acme-site') => spawnSync(process.execPath, [helper, name, repository], { cwd: root, encoding: 'utf8' }),
  };
}

test('initializes metadata, preserves project data, and removes only sandbox files', (t) => {
  const project = fixture(t);
  project.write('.env', 'KEEP=existing-secret');
  project.write('LICENSE.md', 'Keep the license.');
  project.write('.github/workflows/ci.yml', 'Keep automation.');
  project.write('public/app/themes/wp-theme/source.txt', 'Keep component source.');
  project.write('package.json', JSON.stringify({ name: 'wp-project', scripts: { build: 'custom-build' } }));
  project.write('package-lock.json', JSON.stringify({ name: 'wp-project', packages: { '': { name: 'wp-project' }, 'node_modules/example': { version: '1.2.3' } } }));

  const result = project.run();
  assert.equal(result.status, 0, result.stderr);
  const composer = JSON.parse(project.read('composer.json'));
  assert.equal(composer.name, 'indiebranch/acme-site');
  assert.equal(composer.support.source, 'https://github.com/indiebranch/acme-site');
  assert.equal(composer.custom, 'preserve');
  assert.deepEqual(composer.require, { php: '>=8.3' });
  assert.equal(JSON.parse(project.read('package.json')).scripts.build, 'custom-build');
  const lock = JSON.parse(project.read('package-lock.json'));
  assert.equal(lock.packages[''].name, 'acme-site');
  assert.equal(lock.packages['node_modules/example'].version, '1.2.3');
  assert.match(project.read('.ddev/config.yaml'), /^name: acme-site\n/);
  assert.match(project.read('README.md'), /^# acme-site\n\n/);
  assert.match(project.read('README.md'), /Roots Software LLC/);
  assert.doesNotMatch(project.read('README.md'), /docs\/sandbox\.md|### Initialize a new project/);
  assert.equal(project.read('.env'), 'KEEP=existing-secret');
  assert.equal(project.read('LICENSE.md'), 'Keep the license.');
  assert.equal(project.read('.github/workflows/ci.yml'), 'Keep automation.');
  assert.equal(project.read('public/app/themes/wp-theme/source.txt'), 'Keep component source.');
  for (const path of sandboxFiles) assert.equal(project.has(path), false, path);
});

test('same-name reruns preserve initialized metadata and do not create .env', (t) => {
  const project = fixture(t);
  assert.equal(project.run().status, 0);
  const composer = JSON.parse(project.read('composer.json'));
  composer.description = 'Keep my edited description.';
  project.write('composer.json', JSON.stringify(composer));
  const before = project.read('composer.json');
  assert.equal(project.run().status, 0);
  assert.equal(project.read('composer.json'), before);
  assert.equal(project.has('.env'), false);
});

test('invalid identities and a different-name rerun are rejected', (t) => {
  const project = fixture(t);
  const before = project.read('composer.json');
  for (const [name, repository] of [['../invalid', 'indiebranch/site'], ['wp-project', 'indiebranch/site'], ['site', 'indiebranch/wp-project']]) {
    assert.notEqual(project.run(name, repository).status, 0);
    assert.equal(project.read('composer.json'), before);
  }
  assert.equal(project.run().status, 0);
  const initialized = project.read('composer.json');
  assert.notEqual(project.run('different-site', 'indiebranch/different-site').status, 0);
  assert.equal(project.read('composer.json'), initialized);
});

test('invalid optional JSON is caught before writing or cleaning files', (t) => {
  const project = fixture(t);
  project.write('package.json', '{invalid');
  const before = project.read('composer.json');
  assert.notEqual(project.run().status, 0);
  assert.equal(project.read('composer.json'), before);
  for (const path of sandboxFiles) assert.equal(project.has(path), true, path);
});

test('host command keeps itself after a failed lock refresh and removes itself after success', (t) => {
  const project = fixture(t);
  const initializerFiles = ['.ddev/commands/host/project', '.ddev/scripts/project-init.mjs', 'tests/Tooling/project-init.test.mjs', 'docs/project-init.md'];
  for (const path of initializerFiles) {
    project.write(path, readFileSync(new URL(`../../${path}`, import.meta.url)));
  }
  assert.equal(spawnSync('git', ['init', '--quiet', project.root]).status, 0);
  project.write('.env', 'KEEP=existing-secret');
  chmodSync(join(project.root, '.env'), 0o600);
  project.write('bin/build-release', 'Keep release tooling.');
  project.write('fake-tools/ddev', `#!/usr/bin/env node
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args[0] === 'config') {
  const path = '.ddev/config.yaml';
  fs.writeFileSync(path, fs.readFileSync(path, 'utf8').replace(/^name:.*$/m, 'name: ' + args[1].split('=')[1]));
} else if (args[0] === 'start' || args[0] === 'restart') {
  fs.rmSync('.env', { force: true });
  fs.writeFileSync('.env', 'DDEV_GENERATED=temporary');
} else if (args[0] === 'exec') {
  process.exit(spawnSync(process.execPath, args.slice(3), { stdio: 'inherit' }).status);
} else if (args[0] === 'composer' && process.env.FAIL_COMPOSER === '1') {
  process.exit(7);
}
`);
  chmodSync(join(project.root, 'fake-tools/ddev'), 0o755);
  const environment = {
    ...process.env,
    DDEV_APPROOT: project.root,
    PATH: `${join(project.root, 'fake-tools')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
    FAIL_COMPOSER: '1',
  };
  const command = join(project.root, '.ddev/commands/host/project');
  const run = () => spawnSync('bash', [command, 'init', 'acme-site', '--repository', 'indiebranch/acme-site'], { cwd: project.root, env: environment, encoding: 'utf8' });

  const failed = run();
  assert.equal(failed.status, 7, failed.stderr);
  for (const path of initializerFiles) assert.equal(project.has(path), true, path);
  assert.equal(project.read('.env'), 'KEEP=existing-secret');

  environment.FAIL_COMPOSER = '0';
  const completed = run();
  assert.equal(completed.status, 0, completed.stderr);
  for (const path of initializerFiles) assert.equal(project.has(path), false, path);
  assert.equal(project.read('.env'), 'KEEP=existing-secret');
  assert.equal(project.read('bin/build-release'), 'Keep release tooling.');
});
