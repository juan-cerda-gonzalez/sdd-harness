Verify the OpenSpec change:

$ARGUMENTS

## Usage

`/verify <change-name>`

Example:

`/verify create-auth-services`

## Scope

Perform a fast verification only.

## Instructions

1. Confirm the current directory is the project root and contains:
   - `openspec/`
   - `backend/`

2. Run:

   `openspec status --change "$ARGUMENTS"`

3. Read only:

   `openspec/changes/$ARGUMENTS/tasks.md`

4. From the `backend/` directory, run only:

   - `npm run build`
   - `npm test`

5. Count from `tasks.md`:
   - completed tasks `[x]`;
   - pending tasks `[ ]`;
   - blocked tasks containing `BLOCKED`.

6. Do not:
   - run coverage;
   - inspect Git;
   - run `git status` or `git diff`;
   - read proposal, design, specs, docs, source files, or test files;
   - search the repository;
   - inspect previous verification reports;
   - modify files;
   - archive;
   - commit;
   - push;
   - update Jira.

7. Only inspect additional files when build or tests fail, and inspect only the minimum files required to explain the failure.

## Archive decision

Return `Ready to archive: Yes` only when:

- OpenSpec reports all required artifacts complete;
- build passes;
- tests pass;
- there are no pending or blocked tasks.

Otherwise return `Ready to archive: No`.

## Final response

Return no more than 7 lines:

- Artifacts: pass/fail
- Build: pass/fail
- Tests: pass/fail and passed test count
- Completed tasks: count
- Pending tasks: count
- Blocked tasks: count
- Ready to archive: yes/no