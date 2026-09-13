const { resolveActiveChange } = require('./lib/change-context');
const { appendReviewSection } = require('./lib/review-findings');

// PostToolUse hook on ReportFindings (used internally by /code-review).
// Persists findings to openspec/changes/<name>/review-findings.md so Gate C
// can check them later without depending on conversation memory.
// Non-blocking by design: this only records, it never fails the tool call.
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const findings = (payload.tool_input && payload.tool_input.findings) || [];

  const { name, names, error } = resolveActiveChange(process.cwd());
  if (!name) {
    const reason = error === 'ambiguous'
      ? `multiple active changes (${names.join(', ')}) — could not tell which one this review belongs to`
      : 'no active OpenSpec change found';
    console.log(JSON.stringify({
      systemMessage: `Code review findings were NOT recorded to an OpenSpec change: ${reason}. Gate C will not be able to verify them before /archive or commit.`,
    }));
    process.exit(0);
  }

  const filePath = appendReviewSection(process.cwd(), name, findings);
  console.log(JSON.stringify({
    systemMessage: `Recorded ${findings.length} finding(s) to ${filePath}`,
  }));
  process.exit(0);
});
