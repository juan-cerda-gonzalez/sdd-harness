const { execSync } = require('child_process');

// UserPromptSubmit hook. Only acts when the prompt is an /apply invocation.
// Blocks it if no OpenSpec change exists yet, or the named change doesn't
// exist (Gate A).
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const prompt = (payload.prompt || '').trim();
  const match = prompt.match(/^\/apply\s*(\S+)?/);
  if (!match) {
    process.exit(0);
  }

  const requestedName = match[1];

  let list;
  try {
    const raw = execSync('openspec list --json', { encoding: 'utf8', cwd: process.cwd() });
    list = JSON.parse(raw);
  } catch (err) {
    // Fail open: if the CLI itself is unavailable, don't block on a broken tool.
    process.exit(0);
  }

  const changes = Array.isArray(list) ? list : (list.changes || []);
  const names = changes.map((c) => (typeof c === 'string' ? c : c.name || c.id));

  if (names.length === 0) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Gate A failed: no OpenSpec change exists yet. Run /new <description> first.',
    }));
    process.exit(0);
  }

  if (requestedName && !names.includes(requestedName)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Gate A failed: change "${requestedName}" was not found. Available changes: ${names.join(', ')}. Run /new first if this is a new request.`,
    }));
    process.exit(0);
  }

  process.exit(0);
});
