#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');
const target = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const stats = { copied: [], skipped: [], linked: [], errors: [] };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pathExists(p) {
  try { fs.lstatSync(p); return true; } catch { return false; }
}

function copyRecursive(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
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

function main() {
  console.log('\n  lidr-specboot');
  console.log('  Augmented Spec-driven development powered by OpenSpec\n');
  console.log(`  Target: ${target}\n`);

  copyRecursive(TEMPLATE_DIR, target);

  for (const name of ['CLAUDE.md', 'AGENTS.md', 'codex.md', 'GEMINI.md']) {
    createSymlink(name, 'docs/base-standards.md');
  }

  const agents = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'agents'))
    .filter(f => !f.startsWith('.'));
  const skills = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'skills'))
    .filter(f => !f.startsWith('.'));
  const commands = fs.readdirSync(path.join(TEMPLATE_DIR, 'ai-specs', 'commands'))
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
  }

  console.log(`  Files copied  ${stats.copied.length}`);
  console.log(`  Symlinks      ${stats.linked.length}`);
  console.log(`  Skipped       ${stats.skipped.length}`);

  if (stats.errors.length) {
    console.log(`\n  Errors (${stats.errors.length}):`);
    for (const e of stats.errors) console.log(`    ! ${e}`);
  }

  console.log('\n  Next steps:');
  console.log('  1. Update docs/ to match your project (stack, API, data model)');
  console.log('  2. openspec init');
  console.log('  3. /enrich-us -> /new -> /apply -> /verify -> /code-review -> /archive -> /commit\n'
);
}

main();
