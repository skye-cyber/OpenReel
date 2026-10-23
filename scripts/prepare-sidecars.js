import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const script = isWindows ? 'scripts/prepare-sidecars.ps1' : 'scripts/prepare-sidecars.sh';

const result = isWindows
  ? spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { stdio: 'inherit' })
  : spawnSync('bash', [script], { stdio: 'inherit' });

process.exit(result.status ?? 1);
