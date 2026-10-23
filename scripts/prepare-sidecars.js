import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const binDir = path.join(repoRoot, 'src-tauri', 'binaries');

/**
 * Get the Rust host triple. Used to name the sidecars so Tauri can
 * find them at build time and rename them at bundle time.
 */
function triple() {
  const out = execSync('rustc -vV', { encoding: 'utf8' });
  const line = out.split('\n').find(l => l.startsWith('host:'));
  if (!line) throw new Error('rustc did not report a host triple');
  return line.replace('host:', '').trim();
}

function ensureBinDir() {
  fs.mkdirSync(binDir, { recursive: true });
}

function exists(name) {
  return fs.existsSync(path.join(binDir, name));
}

/**
 * Download the johnvansickle static FFmpeg build and stage ffmpeg +
 * ffprobe with the target-triple suffix.
 *
 * The archive layout is a versioned top-level directory:
 *   ffmpeg-<version>-amd64-static/
 *     ffmpeg, ffprobe, GPLv3.txt, manpages/, model/, qt-faststart, readme.txt
 *
 * curl -fL is required: -f exits on HTTP errors instead of writing an
 * HTML error page to the file, -L follows the redirect that
 * johnvansickle.com's stable alias uses.
 */
function downloadAndExtractLinux(t) {
  const arch = process.arch; // 'x64' | 'arm64'
  const url = arch === 'arm64'
  ? 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz'
  : 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';

  const archive = path.join(os.tmpdir(), 'ffmpeg-static.tar.xz');
  const extract = path.join(os.tmpdir(), 'ffmpeg-static-extract');

  console.log(`Fetching ${url}`);
  execSync(`curl -fL "${url}" -o "${archive}"`, { stdio: 'inherit' });

  // Verify it's actually an xz archive, not an HTML error page.
  const head = fs.readFileSync(archive).subarray(0, 6);
  if (head[0] !== 0xfd || head[1] !== 0x37 || head[2] !== 0x7a || head[3] !== 0x58) {
    throw new Error(
      `Downloaded file is not an xz archive (first bytes: ${head.toString('hex')}). ` +
      `The download URL may have returned an HTML error page.`
    );
  }

  if (fs.existsSync(extract)) fs.rmSync(extract, { recursive: true, force: true });
  fs.mkdirSync(extract, { recursive: true });
  execSync(`tar -xJf "${archive}" -C "${extract}"`, { stdio: 'inherit' });

  const top = fs.readdirSync(extract, { withFileTypes: true })
  .find(e => e.isDirectory());
  if (!top) throw new Error('Unexpected archive layout: no top-level directory');

  const srcDir = path.join(extract, top.name);
  for (const bin of ['ffmpeg', 'ffprobe']) {
    const src = path.join(srcDir, bin);
    if (!fs.existsSync(src)) {
      throw new Error(`Expected ${bin} at ${src}, but it doesn't exist`);
    }
    const dest = path.join(binDir, `openreel-${bin}-${t}`);
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o755);
    console.log(`Staged ${dest}`);
  }
}

/**
 * Download the gyan.dev essentials FFmpeg build and stage ffmpeg.exe +
 * ffprobe.exe with the target-triple suffix.
 *
 * The zip layout is a versioned top-level directory:
 *   ffmpeg-<version>-essentials_build/
 *     bin/ffmpeg.exe, bin/ffprobe.exe, ...
 */
function downloadWindows(t) {
  const url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
  const zip = path.join(os.tmpdir(), 'ffmpeg-essentials.zip');
  const extract = path.join(os.tmpdir(), 'ffmpeg-essentials-extract');

  console.log(`Fetching ${url}`);
  execSync(`curl -fL "${url}" -o "${zip}"`, { stdio: 'inherit' });

  if (fs.existsSync(extract)) fs.rmSync(extract, { recursive: true, force: true });
  fs.mkdirSync(extract, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${extract}' -Force"`,
    { stdio: 'inherit' }
  );

  const top = fs.readdirSync(extract, { withFileTypes: true })
  .find(e => e.isDirectory());
  if (!top) throw new Error('Unexpected archive layout: no top-level directory');

  for (const bin of ['ffmpeg', 'ffprobe']) {
    const src = path.join(extract, top.name, 'bin', `${bin}.exe`);
    if (!fs.existsSync(src)) {
      throw new Error(`Expected ${bin}.exe at ${src}, but it doesn't exist`);
    }
    const dest = path.join(binDir, `openreel-${bin}-${t}.exe`);
    fs.copyFileSync(src, dest);
    console.log(`Staged ${dest}`);
  }
}

function main() {
  const t = triple();
  console.log(`Target triple: ${t}`);
  ensureBinDir();

  const ffmpegExists = exists(`openreel-ffmpeg-${t}`) || exists(`openreel-ffmpeg-${t}.exe`);
  const ffprobeExists = exists(`openreel-ffprobe-${t}`) || exists(`openreel-ffprobe-${t}.exe`);
  if (ffmpegExists && ffprobeExists) {
    console.log(`Sidecars already present for ${t}`);
    return;
  }

  if (process.platform === 'linux') {
    downloadAndExtractLinux(t);
    return;
  }

  if (process.platform === 'win32') {
    downloadWindows(t);
    return;
  }

  if (process.platform === 'darwin') {
    console.log('Skipping sidecars on macOS — static FFmpeg is not bundled in this build.');
    console.log('MKV/HEVC transcoding will be unavailable. See README → Known issues.');
    process.exit(0);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
