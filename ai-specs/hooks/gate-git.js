const { runBuildTest } = require('./lib/run-build-test');
const { resolveActiveChange } = require('./lib/change-context');
const { getUnresolvedFromLatestSection } = require('./lib/review-findings');
const { findMissingDocUpdates } = require('./lib/doc-sync');

// PreToolUse hook for Bash(git commit *) and Bash(git push *).
// Gate B: blocks if backend build or tests fail.
// Gate C: blocks if code review was never run, or left unresolved CONFIRMED
// findings, for the active OpenSpec change.
// Gate D: blocks if staged changes touch schema/entities/API/deps without
// staging the corresponding documentation file.
const projectRoot = process.cwd();

const buildResult = runBuildTest(projectRoot);
if (!buildResult.ok) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `Gate B failed: backend build or tests are not green. Fix them before committing/pushing.\n\n${buildResult.summary}`,
  }));
  process.exit(0);
}

if (process.env.SKIP_GATE_C === '1') {
  console.log(JSON.stringify({
    systemMessage: 'Gate C skipped via SKIP_GATE_C=1. Unresolved code-review findings, if any, were not checked.',
  }));
} else {
  const { name, names, error } = resolveActiveChange(projectRoot);
  if (name) {
    const unresolved = getUnresolvedFromLatestSection(projectRoot, name);
    if (unresolved === null) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Gate C failed: no /code-review findings recorded for change "${name}". Run /code-review before committing/pushing.`,
      }));
      process.exit(0);
    }
    if (unresolved.length > 0) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Gate C failed: unresolved CONFIRMED code-review findings for change "${name}":\n\n${unresolved.join('\n')}\n\nFix them, or explicitly accept the risk and ask to bypass Gate C.`,
      }));
      process.exit(0);
    }
  } else if (error === 'ambiguous') {
    console.log(JSON.stringify({
      systemMessage: `Gate C could not be checked: multiple active changes (${names.join(', ')}). Verify code-review findings manually before committing/pushing.`,
    }));
  }
  // error === 'no-changes' or 'openspec-unavailable': nothing to gate against, proceed.
}

if (process.env.SKIP_GATE_D === '1') {
  console.log(JSON.stringify({
    systemMessage: 'Gate D skipped via SKIP_GATE_D=1. Documentation sync was not checked.',
  }));
  process.exit(0);
}

const missingDocs = findMissingDocUpdates(projectRoot);
if (missingDocs.length > 0) {
  const details = missingDocs
    .map((m) => `- ${m.label}: staged files touch ${m.matchedFiles.join(', ')} but ${m.requiredDoc} was not staged`)
    .join('\n');
  console.log(JSON.stringify({
    decision: 'block',
    reason: `Gate D failed: documentation out of sync with staged changes.\n\n${details}\n\nUpdate and stage the required documentation (see docs/documentation-standards.md), or set SKIP_GATE_D=1 to bypass explicitly.`,
  }));
  process.exit(0);
}

process.exit(0);
