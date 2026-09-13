Archive the following OpenSpec change:

$ARGUMENTS

## Usage

`/archive <change-name>`

Example:

`/archive create-auth-services`

## Preconditions

Apply Gate B and Gate C from `ai-specs/commands/_preconditions.md` before archiving.

## Instructions

1. Confirm that a change name was provided.
2. Execute the official OpenSpec slash command:

   `/openspec-archive-change <change-name>`

3. Do not replace it with a shell command.
4. Do not commit or push changes automatically.
5. After execution, report:
   - whether the change was archived;
   - which specs were promoted;
   - where the archived change was stored;
   - any warnings or pending tasks reported by OpenSpec.