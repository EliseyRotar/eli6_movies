#!/usr/bin/env node
/**
 * dev:android — boot an emulator (if needed), start Metro, then install and
 * launch the app on the emulator. One command for the whole dev loop.
 *
 * Usage:
 *   npm run dev:android                 # uses default AVD (Television_4K, or first found)
 *   npm run dev:android -- --avd Pixel_10_Pro
 *   ANDROID_AVD=Pixel_10_Pro npm run dev:android
 */
const { spawn, execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const http = require('http');

const log = (msg) => console.log(`\x1b[36m[dev:android]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[dev:android]\x1b[0m ${msg}`);
  process.exit(1);
};

// ── Resolve the Android SDK ────────────────────────────────────────────────
function androidHome() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  const candidates = [
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'android-sdk'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const sdk = androidHome();
if (!sdk) fail('Android SDK not found. Set ANDROID_HOME.');

const emulatorBin = path.join(sdk, 'emulator', 'emulator');
const adbBin = path.join(sdk, 'platform-tools', 'adb');
if (!fs.existsSync(emulatorBin)) fail(`emulator not found at ${emulatorBin}`);
if (!fs.existsSync(adbBin)) fail(`adb not found at ${adbBin}`);

// ── Parse args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let avd = process.env.ANDROID_AVD || null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--avd' && args[i + 1]) {
    avd = args[i + 1];
    i++;
  }
}

function listAvds() {
  try {
    return execSync(`"${emulatorBin}" -list-avds`, { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function adb(...a) {
  return execSync(`"${adbBin}" ${a.join(' ')}`, { encoding: 'utf8' }).trim();
}

function adbShell(...a) {
  return execSync(`"${adbBin}" shell ${a.join(' ')}`, { encoding: 'utf8' }).trim();
}

function bootedDevices() {
  const out = adb('devices');
  return out
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('*'))
    .filter((l) => l.split(/\s+/)[1] === 'device')
    .map((l) => l.split(/\s+/)[0]);
}

function waitForBoot(serial) {
  log(`Waiting for ${serial} to finish booting…`);
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const done = adbShell('-s', serial, 'getprop', 'sys.boot_completed');
      if (done.trim() === '1') {
        log('Boot complete.');
        return;
      }
    } catch {
      /* not ready yet */
    }
    execSync('sleep 2');
  }
  fail('Timed out waiting for the emulator to boot.');
}

function isMetroRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8081/status', (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForMetro() {
  log('Waiting for Metro (port 8081)…');
  return new Promise((resolve) => {
    const deadline = Date.now() + 60000;
    const poll = () => {
      const req = http.get('http://localhost:8081/status', (res) => {
        res.resume();
        if (res.statusCode === 200) {
          log('Metro is up.');
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        fail('Timed out waiting for Metro. Is port 8081 free?');
      }
      setTimeout(poll, 1000);
    };
    poll();
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const avds = listAvds();
  if (avds.length === 0) {
    fail('No AVDs found. Create one in Android Studio (AVD Manager).');
  }

  if (!avd) {
    avd = avds.includes('Television_4K') ? 'Television_4K' : avds[0];
  }
  if (!avds.includes(avd)) {
    fail(`AVD "${avd}" not found. Available: ${avds.join(', ')}`);
  }

  // 1. Ensure an emulator is running (or boot one).
  const devices = bootedDevices();
  if (devices.length === 0) {
    log(`Booting emulator "${avd}"…`);
    spawn(emulatorBin, ['-avd', avd], { stdio: 'ignore', detached: true }).unref();
    // Wait for the device to appear, then for boot to complete.
    try {
      execSync(`"${adbBin}" wait-for-device`, { stdio: 'inherit' });
    } catch {
      fail('Emulator did not come online.');
    }
    const serial = bootedDevices()[0];
    if (!serial) fail('No booted device found after launching emulator.');
    waitForBoot(serial);
  } else {
    log(`Using already-running device: ${devices[0]}`);
  }

  // 2. Start Metro in the background (only if not already running).
  if (await isMetroRunning()) {
    log('Metro is already running on port 8081 — reusing it.');
  } else {
    log('Starting Metro…');
    const metro = spawn('npx', ['react-native', 'start'], {
      stdio: 'inherit',
      detached: true,
    });
    metro.unref();
    await waitForMetro();
  }

  // 3. Install and launch the app.
  log('Installing and launching the app…');
  const run = spawn('npx', ['react-native', 'run-android'], { stdio: 'inherit' });
  run.on('exit', (code) => {
    log(`run-android finished (exit ${code}). Metro keeps running in the background.`);
    process.exit(code ?? 0);
  });
}

main().catch((e) => fail(e.message));
