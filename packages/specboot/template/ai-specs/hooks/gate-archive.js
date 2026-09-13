const { runBuildTest } = require('./lib/run-build-test');
const { resolveActiveChange } = require('./lib/change-context');
const { getUnresolvedFromLatestSection } = require('./lib/review-findings');

// UserPromptSubmit hook. Only acts when the prompt is an /archive invocation.
// Gate B: blocks if backend build or tests fail.
// Gate C: blocks if code review was never run, or left unresolved CONFIRMED
// findings, for the change being archived.
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
  const match = prompt.match(/^\/archive\s*(\S+)?/);
  if (!match) {
    process.exit(0);
  }

  const projectRoot = process.cwd();
  const buildResult = runBuildTest(projectRoot);
  if (!buildResult.ok) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Gate B failed: backend build or tests are not green. Fix them before archiving.\n\n${buildResult.summary}`,
    }));
    process.exit(0);
  }

  if (process.env.SKIP_GATE_C === '1') {
    console.log(JSON.stringify({
      systemMessage: 'Gate C skipped via SKIP_GATE_C=1. Unresolved code-review findings, if any, were not checked.',
    }));
    process.exit(0);
  }

  const explicitName = match[1];
  let changeName = explicitName;
  if (!changeName) {
    const resolved = resolveActiveChange(projectRoot);
    changeName = resolved.name;
  }

  if (changeName) {
    const unresolved = getUnresolvedFromLatestSection(projectRoot, changeName);
    if (unresolved === null) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Gate C failed: no /code-review findings recorded for change "${changeName}". Run /code-review before archiving.`,
      }));
      process.exit(0);
    }
    if (unresolved.length > 0) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Gate C failed: unresolved CONFIRMED code-review findings for change "${changeName}":\n\n${unresolved.join('\n')}\n\nFix them, or explicitly accept the risk and ask to bypass Gate C.`,
      }));
      process.exit(0);
    }
  }

  process.exit(0);
});
