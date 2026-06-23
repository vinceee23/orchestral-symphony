// Launcher script that ensures ELECTRON_RUN_AS_NODE is not set
// (VSCode sets this env var which prevents Electron from initializing)
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, '..', '.electron-dist', 'electron.exe');
const mainScript = path.join(__dirname, '..'); // points to package.json "main"

// Build env without ELECTRON_RUN_AS_NODE
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [mainScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 1));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
