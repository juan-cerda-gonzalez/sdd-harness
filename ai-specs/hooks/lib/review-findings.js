const fs = require('fs');
const path = require('path');

function findingsFilePath(projectRoot, changeName) {
  return path.join(projectRoot, 'openspec', 'changes', changeName, 'review-findings.md');
}

function findingLine(finding) {
  const checked = finding.outcome ? 'x' : ' ';
  const verdict = finding.verdict || 'UNVERIFIED';
  const location = finding.file ? `${finding.file}${finding.line ? ':' + finding.line : ''}` : 'unknown location';
  const category = finding.category || 'finding';
  const summary = finding.short_summary || finding.summary || '(no summary)';
  const outcomeSuffix = finding.outcome ? ` — outcome: ${finding.outcome}` : '';
  return `- [${checked}] [${verdict}] ${category}: ${summary} (${location})${outcomeSuffix}`;
}

// Appends a new "## Review at <timestamp>" section. Each /code-review run
// gets its own section; the gate only ever reads the most recent one, since
// a re-report call already carries `outcome` for findings that were fixed.
function appendReviewSection(projectRoot, changeName, findings) {
  const filePath = findingsFilePath(projectRoot, changeName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const header = fs.existsSync(filePath) ? '' : `# Review Findings — ${changeName}\n\n`;
  const timestamp = new Date().toISOString();
  const lines = findings.length > 0
    ? findings.map(findingLine).join('\n')
    : '_No findings reported._';

  const section = `## Review at ${timestamp}\n\n${lines}\n\n`;
  fs.appendFileSync(filePath, header + section, 'utf8');
  return filePath;
}

// Returns unresolved CONFIRMED findings from the latest review section, or
// null if the file doesn't exist at all (meaning no review was ever run).
function getUnresolvedFromLatestSection(projectRoot, changeName) {
  const filePath = findingsFilePath(projectRoot, changeName);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const sections = content.split(/^## Review at /m).filter(Boolean);
  if (sections.length === 0) {
    return [];
  }

  const latest = sections[sections.length - 1];
  const unresolvedLines = latest
    .split('\n')
    .filter((line) => /^- \[ \] \[CONFIRMED\]/.test(line));

  return unresolvedLines;
}

module.exports = { findingsFilePath, appendReviewSection, getUnresolvedFromLatestSection };
