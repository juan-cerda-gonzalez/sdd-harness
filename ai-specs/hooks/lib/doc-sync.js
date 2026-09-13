const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadRules(projectRoot) {
  const rulesPath = path.join(projectRoot, 'ai-specs', 'hooks', 'lib', 'doc-sync-rules.json');
  return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
}

function getStagedFiles(projectRoot) {
  const raw = execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: projectRoot });
  return raw.split('\n').map((f) => f.trim()).filter(Boolean);
}

// Returns a list of { label, requiredDoc, matchedFiles } for rules whose
// source patterns matched staged files but whose requiredDoc was NOT
// also staged. Empty array means everything required is in sync.
function findMissingDocUpdates(projectRoot) {
  const rules = loadRules(projectRoot);
  const staged = getStagedFiles(projectRoot);
  const stagedSet = new Set(staged);

  const missing = [];
  for (const rule of rules) {
    const patterns = rule.sourcePatterns.map((p) => new RegExp(p));
    const matchedFiles = staged.filter((f) => patterns.some((re) => re.test(f)));
    if (matchedFiles.length === 0) {
      continue;
    }
    if (!stagedSet.has(rule.requiredDoc)) {
      missing.push({ label: rule.label, requiredDoc: rule.requiredDoc, matchedFiles });
    }
  }
  return missing;
}

module.exports = { findMissingDocUpdates };
