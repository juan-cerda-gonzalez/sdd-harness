const { execSync } = require('child_process');

// Resolves which OpenSpec change is "active" for hooks that need a change
// name but weren't given one explicitly (e.g. a bare `git commit`).
// Returns { name, names, error } — name is null when it can't be resolved
// unambiguously (zero or multiple active changes).
function resolveActiveChange(cwd) {
  let list;
  try {
    const raw = execSync('openspec list --json', { encoding: 'utf8', cwd });
    list = JSON.parse(raw);
  } catch (err) {
    return { name: null, names: [], error: 'openspec-unavailable' };
  }

  const changes = Array.isArray(list) ? list : (list.changes || []);
  const names = changes.map((c) => (typeof c === 'string' ? c : c.name || c.id));

  if (names.length === 0) {
    return { name: null, names: [], error: 'no-changes' };
  }
  if (names.length > 1) {
    return { name: null, names, error: 'ambiguous' };
  }
  return { name: names[0], names, error: null };
}

module.exports = { resolveActiveChange };
