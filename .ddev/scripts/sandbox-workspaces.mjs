import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const candidates = [
  ['public/app/themes/wp-theme', 'start:theme'],
  ['public/app/plugins/wp-plugin', 'start:plugin'],
];

const assetPackages = candidates.flatMap(([directory, watchScript]) => {
  const manifest = resolve(root, directory, 'package.json');

  if (!existsSync(manifest)) {
    return [];
  }

  const component = JSON.parse(readFileSync(manifest, 'utf8'));

  return component.scripts?.build ? [{ directory, watchScript, component }] : [];
});

if (assetPackages.length === 0) {
  console.log('No starter asset builds found; npm workspace configuration is unchanged.');
  process.exit(0);
}

const manifest = resolve(root, 'package.json');
const project = existsSync(manifest)
  ? JSON.parse(readFileSync(manifest, 'utf8'))
  : { name: 'wp-project', private: true, engines: { node: '>=24', npm: '>=11' } };

project.workspaces ??= [];
project.scripts ??= {};

if (!Array.isArray(project.workspaces)) {
  throw new Error('Sandbox setup expects an array of explicit npm workspace paths.');
}

for (const { directory, watchScript, component } of assetPackages) {
  if (!project.workspaces.includes(directory)) {
    project.workspaces.push(directory);
  }

  if (component.scripts.start) {
    project.scripts[watchScript] ??= `npm run start --workspace ${directory}`;
  }
}

project.scripts.build ??= 'npm run build --workspaces';

writeFileSync(manifest, `${JSON.stringify(project, null, 2)}\n`);
console.log(`Configured sandbox asset workspaces: ${assetPackages.map(({ directory }) => directory).join(', ')}`);
