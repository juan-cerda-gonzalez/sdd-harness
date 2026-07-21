Use the `openspec-propose` skill to create a complete OpenSpec change from the following input:

$ARGUMENTS

## Input handling

- If `$ARGUMENTS` contains a Jira issue key, read the refined issue using the configured Jira MCP.
- Jira access must be read-only during this workflow.
- If Jira MCP is unavailable, ask the user to provide the refined story directly.
- If `$ARGUMENTS` contains the complete story, use it directly without Jira.

## Argument parsing

Interpret `$ARGUMENTS` using one of these formats:

`<jira-key-or-story>`

`<jira-key-or-story> --change-name <change-name>`

Examples:

- `/new VN-3878`
- `/new VN-3878 --change-name enable-person-data-editing`
- `/new "Historia completa en texto libre"`
- `/new "Historia completa en texto libre" --change-name add-task-completion`

Rules:

- The source may be:
  - A Jira key, such as `VN-3878`
  - A complete refined story in direct text
- When `--change-name` is present, use the value that follows it as the OpenSpec change name.
- The change name must use kebab-case.
- If no change name is provided, derive a concise kebab-case name from the capability or behavior described in the story.
- Never use only the Jira key as the change name.
- Before creating the change, verify that the name does not already exist under `openspec/changes/`.
- If the change already exists, ask whether to continue that change or create a different one.


## Project context

Before creating the change:

1. Read `openspec/config.yaml`.
2. Apply the project documentation referenced in that configuration.
3. Review relevant existing specifications under `openspec/specs/`.
4. Follow the complete workflow defined by the `openspec-propose` skill.

## Expected result

Create all planning artifacts required by the configured OpenSpec schema:

- `proposal.md`
- `design.md`
- `specs/**/*.md`
- `tasks.md`

Continue through the artifact dependency order until all planning artifacts are complete.

## Restrictions

- Do not implement application code.
- Do not execute `openspec-apply-change`.
- Do not modify Jira.
- Do not archive the change.
- Do not create a Git commit.
- Do not modify `packages/specboot/template/` unless the requested change explicitly affects the reusable template.

## Final response

Report:

- Generated change name
- Source Jira issue or direct input
- Generated artifact paths
- Final result of `openspec status --change "<change-name>"`
- Any unresolved questions or blocked artifacts