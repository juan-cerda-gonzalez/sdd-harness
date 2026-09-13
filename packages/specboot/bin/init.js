#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');
const FRONTEND_STACKS = ['react', 'vue'];

const cliArgs = process.argv.slice(2);
const stackFlag = cliArgs.find(a => a.startsWith('--'));
const frontendStack = stackFlag ? stackFlag.slice(2) : null;
const positionalArgs = cliArgs.filter(a => !a.startsWith('--'));
const target = positionalArgs[0] ? path.resolve(positionalArgs[0]) : process.cwd();

const stats = { copied: [], skipped: [], linked: [], errors: [], openspec: null, frontendStandards: null };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pathExists(p) {
  try { fs.lstatSync(p); return true; } catch { return false; }
}

// Directories copied selectively by dedicated logic instead of generically,
// keyed by their absolute path under TEMPLATE_DIR so only that exact
// location is skipped (not any nested folder that happens to share a name).
const SELECTIVE_COPY_DIRS = new Set([
  path.join(TEMPLATE_DIR, 'frontend'), // handled by setupFrontendStandards()
]);

function copyRecursive(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (SELECTIVE_COPY_DIRS.has(srcPath)) continue;
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (pathExists(destPath)) {
      stats.skipped.push(path.relative(target, destPath));
    } else {
      fs.copyFileSync(srcPath, destPath);
      stats.copied.push(path.relative(target, destPath));
    }
  }
}

// Picks the frontend-standards.md matching --react or --vue and places it at
// docs/frontend-standards.md. If no flag was given, does nothing (the
// project starts without a frontend standard until one is chosen).
function setupFrontendStandards(stack) {
  if (!stack) return { applied: false, reason: 'no-flag' };

  if (!FRONTEND_STACKS.includes(stack)) {
    return { applied: false, reason: 'unknown-stack', stack };
  }

  const src = path.join(TEMPLATE_DIR, 'frontend', stack, 'frontend-standards.md');
  if (!pathExists(src)) {
    return { applied: false, reason: 'template-missing', stack };
  }

  const dest = path.join(target, 'docs', 'frontend-standards.md');
  if (pathExists(dest)) {
    stats.skipped.push(path.relative(target, dest));
    return { applied: false, reason: 'already-exists', stack };
  }

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  stats.copied.push(path.relative(target, dest));
  return { applied: true, stack };
}

function createSymlink(linkRelPath, symlinkTarget) {
  const full = path.join(target, linkRelPath);
  ensureDir(path.dirname(full));

  if (pathExists(full)) {
    const stat = fs.lstatSync(full);

    // Already a symbolic link
    if (stat.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(full);

      const normalizedCurrentTarget = path.normalize(currentTarget);
      const normalizedExpectedTarget = path.normalize(symlinkTarget);

      if (normalizedCurrentTarget === normalizedExpectedTarget) {
        stats.skipped.push(`${linkRelPath} (symlink already correct)`);
        return;
      }

      stats.errors.push(
        `${linkRelPath}: symlink points to "${currentTarget}", expected "${symlinkTarget}"`
      );
      return;
    }

    // Git on Windows may materialize symlinks as plain-text files
    // containing only the intended relative target.
    if (stat.isFile()) {
      const content = fs.readFileSync(full, 'utf8').trim();

      if (content === symlinkTarget) {
        fs.unlinkSync(full);

        try {
          fs.symlinkSync(symlinkTarget, full);
          stats.linked.push(
            `${linkRelPath} -> ${symlinkTarget} (repaired placeholder)`
          );
        } catch (err) {
          stats.errors.push(`${linkRelPath}: ${err.message}`);
        }

        return;
      }
    }

    // Protect real user/project files.
    stats.skipped.push(`${linkRelPath} (existing non-managed file)`);
    return;
  }

  try {
    fs.symlinkSync(symlinkTarget, full);
    stats.linked.push(`${linkRelPath} -> ${symlinkTarget}`);
  } catch (err) {
    stats.errors.push(`${linkRelPath}: ${err.message}`);
  }
}

// Bootstraps the OpenSpec CLI for both Claude and Cursor, non-interactively,
// via npx so teammates don't need it pre-installed. Never fatal: if it fails
// (no network, npx unavailable, etc.) the rest of the harness still works,
// and the failure is reported so the user can run it manually.
// Pinned (not @latest): the promoteVendorSkills() detection below assumes
// this exact generator's output shape (skill names, identical content across
// tools). Bump deliberately, and re-verify promoteVendorSkills(), rather than
// silently drifting to whatever OpenSpec ships next.
const OPENSPEC_PACKAGE = '@fission-ai/openspec@1.3.1';

function bootstrapOpenSpec() {
  try {
    execSync(`npx --yes -p ${OPENSPEC_PACKAGE} openspec init --tools claude,cursor --force .`, {
      cwd: target,
      stdio: 'pipe',
      timeout: 60000,
    });
    stats.openspec = { ok: true };
  } catch (err) {
    const stderr = (err.stderr || '').toString().trim();
    const stdout = (err.stdout || '').toString().trim();
    const detail = stderr || stdout || (err.signal ? `terminated (${err.signal}), likely timed out` : err.message);
    stats.openspec = { ok: false, message: detail || 'unknown error' };
  }
}

// OpenSpec's own generator writes real (non-symlinked) skill files directly
// into both .claude/skills/<name> and .cursor/skills/<name>. Promote any
// such vendor-generated skill (identical content in both tools, not yet
// canonicalized under ai-specs/skills/) to ai-specs/, then replace both
// copies with symlinks — same convention as the rest of this harness.
// Vendor-generated commands (opsx/*) are intentionally left untouched:
// their frontmatter/path conventions differ per tool and are not
// symlink-compatible.
function promoteVendorSkills() {
  const claudeSkillsDir = path.join(target, '.claude', 'skills');
  const cursorSkillsDir = path.join(target, '.cursor', 'skills');
  if (!pathExists(claudeSkillsDir) || !pathExists(cursorSkillsDir)) return;

  const claudeEntries = fs.readdirSync(claudeSkillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const entry of claudeEntries) {
    const name = entry.name;
    const claudeSkillPath = path.join(claudeSkillsDir, name);
    const cursorSkillPath = path.join(cursorSkillsDir, name);
    const canonicalPath = path.join(target, 'ai-specs', 'skills', name);

    if (fs.lstatSync(claudeSkillPath).isSymbolicLink()) continue; // already canonicalized
    if (pathExists(canonicalPath)) continue; // a project skill already owns this name
    if (!pathExists(cursorSkillPath) || fs.lstatSync(cursorSkillPath).isSymbolicLink()) continue;

    const claudeSkillFile = path.join(claudeSkillPath, 'SKILL.md');
    const cursorSkillFile = path.join(cursorSkillPath, 'SKILL.md');
    if (!pathExists(claudeSkillFile) || !pathExists(cursorSkillFile)) continue;

    const claudeContent = fs.readFileSync(claudeSkillFile, 'utf8');
    const cursorContent = fs.readFileSync(cursorSkillFile, 'utf8');
    if (claudeContent !== cursorContent) continue; // not safely symlink-compatible

    ensureDir(canonicalPath);
    fs.renameSync(claudeSkillFile, path.join(canonicalPath, 'SKILL.md'));
    fs.rmSync(claudeSkillPath, { recursive: true, force: true });
    fs.rmSync(cursorSkillPath, { recursive: true, force: true });

    try {
      fs.symlinkSync(path.join('..', '..', 'ai-specs', 'skills', name), claudeSkillPath);
      fs.symlinkSync(path.join('..', '..', 'ai-specs', 'skills', name), cursorSkillPath);
      stats.linked.push(`.claude/skills/${name} -> ../../ai-specs/skills/${name} (promoted vendor skill)`);
      stats.linked.push(`.cursor/skills/${name} -> ../../ai-specs/skills/${name} (promoted vendor skill)`);
    } catch (err) {
      stats.errors.push(`${name}: failed to symlink promoted skill: ${err.message}`);
    }
  }
}

function main() {
  console.log('\n  sdd-harness');
  console.log('  Augmented Spec-driven development powered by OpenSpec\n');
  console.log(`  Target: ${target}\n`);

  copyRecursive(TEMPLATE_DIR, target);
  stats.frontendStandards = setupFrontendStandards(frontendStack);

  for (const name of ['CLAUDE.md', 'AGENTS.md', 'codex.md', 'GEMINI.md']) {
    createSymlink(name, 'docs/base-standards.md');
  }

  const agents = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'agents'))
    .filter(f => !f.startsWith('.'));
  const skills = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'skills'))
    .filter(f => !f.startsWith('.'));
  const commands = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'commands'))
    .filter(f => !f.startsWith('.'));
  const hooks = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'hooks'))
    .filter(f => !f.startsWith('.')); 
    
  for (const tool of ['.claude', '.cursor']) {
    for (const agent of agents) {
      createSymlink(`${tool}/agents/${agent}`, `../../ai-specs/agents/${agent}`);
    }
    for (const skill of skills) {
      createSymlink(`${tool}/skills/${skill}`, `../../ai-specs/skills/${skill}`);
    }
    for (const command of commands) {
      createSymlink(`${tool}/commands/${command}`, `../../ai-specs/commands/${command}`);
    }
    for (const hook of hooks) {
      createSymlink(`${tool}/hooks/${hook}`, `../../ai-specs/hooks/${hook}`);
    }
  }

  console.log('  Setting up OpenSpec (via npx, no local install required)...');
  bootstrapOpenSpec();
  if (stats.openspec.ok) {
    promoteVendorSkills();
  }

  const frontendStatus = stats.frontendStandards.applied
    ? `docs/frontend-standards.md (${stats.frontendStandards.stack})`
    : 'not set (use --react or --vue)';

  console.log(`  Files copied  ${stats.copied.length}`);
  console.log(`  Symlinks      ${stats.linked.length}`);
  console.log(`  Skipped       ${stats.skipped.length}`);
  console.log(`  OpenSpec      ${stats.openspec.ok ? 'configured (Claude, Cursor)' : 'FAILED'}`);
  console.log(`  Frontend      ${frontendStatus}`);

  if (stats.errors.length) {
    console.log(`\n  Errors (${stats.errors.length}):`);
    for (const e of stats.errors) console.log(`    ! ${e}`);
  }

  console.log('\n  Next steps:');
  const nextSteps = ['Update docs/ to match your project (stack, API, data model)'];
  if (!stats.openspec.ok) {
    nextSteps.push(
      `OpenSpec setup failed automatically. Run manually:\n     npx --yes -p ${OPENSPEC_PACKAGE} openspec init --tools claude,cursor\n     (reason: ${stats.openspec.message || 'unknown error'})`
    );
  }
  if (!stats.frontendStandards.applied && stats.frontendStandards.reason === 'no-flag') {
    nextSteps.push(
      `No frontend stack selected. Re-run with --react or --vue to generate docs/frontend-standards.md (e.g. node ${path.relative(process.cwd(), __filename)} --react ${positionalArgs[0] || '.'})`
    );
  } else if (!stats.frontendStandards.applied && stats.frontendStandards.reason === 'unknown-stack') {
    nextSteps.push(
      `Unknown frontend stack "--${stats.frontendStandards.stack}". Supported: ${FRONTEND_STACKS.map(s => `--${s}`).join(', ')}`
    );
  }
  nextSteps.push('/enrich-us -> /new -> /apply -> /verify -> /code-review -> /archive -> /commit');
  nextSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log('');
}

main();
