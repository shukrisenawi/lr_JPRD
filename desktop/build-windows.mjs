import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const requestedTarget = process.argv[2] ?? 'all';

const targets = requestedTarget === 'all'
    ? ['installer', 'portable']
    : [requestedTarget];

if (! targets.every((target) => ['installer', 'portable'].includes(target))) {
    throw new Error('Target mesti installer, portable atau all.');
}

function runBuilder(target, outputPath) {
    const command = process.execPath;
    const builderCli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
    const builderTarget = target === 'installer' ? 'nsis' : 'portable';

    return new Promise((resolve, reject) => {
        const child = spawn(command, [
            builderCli,
            '--win', builderTarget,
            '--config.directories.output', outputPath,
        ], { cwd: root, stdio: 'inherit' });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`electron-builder gagal untuk target ${target} (kod ${code}).`));
        });
    });
}

for (const target of targets) {
    const tempOutput = path.join(os.tmpdir(), 'jprd-udm-builder', target);
    const releaseOutput = path.join(root, 'release', target);
    const artifactName = `JPRD-UDM-Monitor-${packageJson.version}-x64.exe`;
    const releaseName = target === 'installer'
        ? `JPRD-UDM-Monitor-${packageJson.version}-x64-setup.exe`
        : `JPRD-UDM-Monitor-${packageJson.version}-x64-portable.exe`;

    await fs.rm(tempOutput, { recursive: true, force: true });
    await fs.rm(releaseOutput, { recursive: true, force: true });
    await fs.mkdir(tempOutput, { recursive: true });
    await fs.mkdir(releaseOutput, { recursive: true });
    await runBuilder(target, tempOutput);
    await fs.copyFile(path.join(tempOutput, artifactName), path.join(releaseOutput, releaseName));
}

console.log('Artifact Windows tersedia dalam desktop/release/.');
