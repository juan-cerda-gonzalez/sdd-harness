const { execSync } = require('child_process');
const path = require('path');

function runBuildTest(projectRoot) {
  const backendDir = path.join(projectRoot, 'backend');
  try {
    execSync('npm run build && npm test', {
      cwd: backendDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true };
  } catch (err) {
    const output = `${err.stdout || ''}${err.stderr || ''}`;
    const tail = output.trim().split('\n').slice(-15).join('\n');
    return { ok: false, summary: tail || err.message };
  }
}

module.exports = { runBuildTest };
