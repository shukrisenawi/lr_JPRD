import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const failures = [];

if (existsSync('.vscode/sftp.json')) {
    const config = JSON.parse(readFileSync('.vscode/sftp.json', 'utf8'));
    const connections = Array.isArray(config) ? config : [config];
    if (connections.some((connection) => connection.uploadOnSave || connection.watcher?.autoUpload || connection.watcher?.autoDelete)) {
        failures.push('Disable SFTP uploadOnSave / watcher auto-upload and auto-delete before building production assets.');
    }
}

if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
}
if (process.argv.includes('--preflight')) {
    console.log('Production preflight passed: SFTP auto-upload disabled.');
    process.exit(0);
}

const root = resolve('public/build');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));

for (const [key, entry] of Object.entries(manifest)) {
    for (const file of [entry.file, ...(entry.css || []), ...(entry.assets || [])].filter(Boolean)) {
        const path = resolve(root, file);
        if (!path.startsWith(`${root}${sep}`) || !existsSync(path)) {
            failures.push(`Missing or invalid build asset: ${key} -> ${file}`);
        }
    }
    for (const dependency of [...(entry.imports || []), ...(entry.dynamicImports || [])]) {
        if (!manifest[dependency]) failures.push(`Missing manifest dependency: ${key} -> ${dependency}`);
    }
}

if (!manifest['resources/js/app.jsx']) failures.push('Missing application entrypoint.');
if (existsSync('public/hot')) failures.push('Remove stale public/hot before using production assets.');

if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Build verified: ${Object.keys(manifest).length} manifest entries; assets and dependencies exist; SFTP auto-upload disabled.`);
}
