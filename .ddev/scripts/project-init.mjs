import { existsSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function initialize() {
  const [name, repository] = process.argv.slice(2);

  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name ?? '') || name === 'wp-project') {
    throw new Error('Provide a new lowercase project name, such as acme-website.');
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') || repository === 'indiebranch/wp-project') {
    throw new Error('Provide the new project GitHub repository as owner/repo.');
  }

  const root = process.cwd();
  const file = (path) => resolve(root, path);
  const read = (path) => readFileSync(file(path), 'utf8');
  const json = (path) => JSON.parse(read(path));
  const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
  const composer = json('composer.json');
  const packageName = `indiebranch/${name}`;

  if (composer.name === packageName) {
    console.log(`${packageName} is already initialized; project metadata is unchanged.`);
    return;
  }
  if (composer.name !== 'indiebranch/wp-project') {
    throw new Error('This initializer only converts the wp-project template.');
  }

  const url = `https://github.com/${repository}`;
  const changes = new Map();
  composer.name = packageName;
  composer.description = `WordPress website project for ${name}.`;
  composer.homepage = url;
  composer.support = { ...composer.support, source: url, issues: `${url}/issues` };
  changes.set('composer.json', serialize(composer));

  const config = read('.ddev/config.yaml');
  if (!/^name:[^\r\n]*\r?$/m.test(config)) {
    throw new Error('Expected a top-level name in .ddev/config.yaml.');
  }
  changes.set('.ddev/config.yaml', config.replace(/^name:[^\r\n]*/m, `name: ${name}`));

  if (existsSync(file('package.json'))) {
    const npm = json('package.json');
    npm.name = name;
    changes.set('package.json', serialize(npm));
  }
  if (existsSync(file('package-lock.json'))) {
    const lock = json('package-lock.json');
    lock.name = name;
    if (lock.packages?.['']) lock.packages[''].name = name;
    changes.set('package-lock.json', serialize(lock));
  }

  let readme = read('README.md')
    .replace(/^# wp-project[\t ]*$/m, `# ${name}`)
    .replace('A reusable WordPress project starter by IndieBranch', 'A WordPress project maintained by IndieBranch')
    .replaceAll('https://github.com/indiebranch/wp-project.git', `${url}.git`)
    .replace(/^cd wp-project$/m, `cd ${name}`)
    .replace(/To develop the reusable theme and plugin starters[^\n]*\n\[sandbox setup\]\(docs\/sandbox\.md\)\.\n\n/, '');

  const initStart = readme.indexOf('### Initialize a new project\n');
  if (initStart !== -1) {
    const nextHeading = readme.indexOf('\n### ', initStart + 1);
    if (nextHeading === -1) throw new Error('Expected the next getting-started section.');
    readme = readme.slice(0, initStart) + readme.slice(nextHeading + 1);
  }
  changes.set('README.md', readme);

  const sandboxFiles = [
    '.ddev/commands/host/sandbox',
    '.ddev/scripts/sandbox-workspaces.mjs',
    '.ddev/docker-compose.sandbox.yaml',
    'docs/sandbox.md',
  ];
  for (const path of sandboxFiles) {
    if (existsSync(file(path)) && lstatSync(file(path)).isDirectory()) {
      throw new Error(`Expected a sandbox file, not a directory: ${path}`);
    }
  }

  // Validate inputs before writing; cleanup never traverses mounted directories.
  for (const [path, content] of changes) writeFileSync(file(path), content);
  for (const path of sandboxFiles) {
    if (existsSync(file(path))) unlinkSync(file(path));
  }

  console.log(`Initialized ${packageName} for ${url}.`);
}

try {
  initialize();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
