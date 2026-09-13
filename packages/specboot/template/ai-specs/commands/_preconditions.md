# Shared Preconditions

Reusable gates referenced by other commands and skills in `ai-specs/`. Do not invoke this file directly; it is applied by the commands that reference it (`/apply`, `/archive`, `commit`).

## Gate A — Change must exist

Applies to: `/apply`

1. Determine the target change name (explicit argument, or inferred from conversation context).
2. Run `openspec list --json`.
3. If the list is empty, or the requested `<change-name>` is not present in it:
   - Stop. Do not implement anything.
   - Report: "No OpenSpec change found. Run `/new <description>` first."
4. If exactly one active change exists and none was specified, proceed with it (announce which one).
5. If multiple active changes exist and none was specified, ask the user to pick one. Do not guess.

## Gate B — Build and tests must be green

Applies to: `/archive`, `commit` skill

1. From `backend/`, run:
   - `npm run build`
   - `npm test`
2. If both pass, proceed.
3. If either fails:
   - Do not proceed automatically.
   - Report the failure summary (do not dump full logs).
   - Ask the user to confirm explicitly whether to continue anyway (e.g. archiving with known-broken tests, or committing WIP).
   - Proceed only after explicit confirmation; default is to stop.
4. Skip this gate only when the user explicitly requested a no-git / description-only mode (e.g. in `commit`), since nothing is being archived or pushed in that case.

## Gate C — Code review findings must be resolved

Applies to: `/archive`, `commit` skill

Enforced mechanically by hooks (not just this instruction):

- `record-review-findings.js` (`PostToolUse` on `ReportFindings`) persists every `/code-review` run to `openspec/changes/<name>/review-findings.md`.
- `gate-git.js` (`PreToolUse` on `git commit`/`git push`) and `gate-archive.js` (`UserPromptSubmit` on `/archive`) block if:
  - no `review-findings.md` exists yet for the change (code review was never run), or
  - the latest recorded review still has findings with `verdict: CONFIRMED` and no `outcome` set (unresolved).

A finding counts as resolved once `/code-review` re-reports it with `outcome: fixed`, `skipped`, or `no_change_needed`.

If the hook blocks and the user explicitly wants to proceed anyway despite unresolved findings, set `SKIP_GATE_C=1` in the environment for that command. This is a manual, explicit escape hatch — it is never applied silently or inferred, and the hook always reports via `systemMessage` when it was used, so the bypass is visible in the transcript.

## Gate D — Documentation must stay in sync with the change

Applies to: `commit` skill (via `git commit`/`git push`)

Enforced mechanically by `gate-git.js` (`PreToolUse` on `git commit`/`git push`), using the mapping in `ai-specs/hooks/lib/doc-sync-rules.json` (e.g. domain models/schema changes require `docs/data-model.md`; presentation/controller changes require `docs/api-spec.yml`; dependency changes require `docs/backend-standards.md`). It blocks if staged files match a rule's source patterns but the required doc file was not also staged.

**Auto-remediation (do this automatically, do not just report the block to the user):**

1. If a `git commit`/`git push` is blocked with a `Gate D failed` reason, immediately invoke the `update-docs` skill for the change just implemented, using the matched source files from the block reason as the scope.
2. Stage the documentation file(s) `update-docs` produced or edited (`git add <doc-path>`).
3. Retry the same `git commit`/`git push` command.
4. If Gate D blocks again after this (e.g. `update-docs` could not determine what to write, or the mapped doc still wasn't touched), stop and report the situation to the user instead of retrying indefinitely — do not loop more than once.
5. Never bypass Gate D by writing placeholder or empty content into the required doc just to satisfy the check; the content must genuinely reflect the change.

Bypass: set `SKIP_GATE_D=1` in the environment to commit/push without this check. This is a manual, explicit escape hatch, never applied silently or inferred; the hook reports via `systemMessage` when used.
