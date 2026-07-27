Use the `openspec-propose` skill to create a complete OpenSpec change from the following input:

$ARGUMENTS

## Input handling

- If `$ARGUMENTS` contains a Jira issue key, read the refined issue using the configured Jira MCP.
- Jira access must be read-only during this workflow.
- If Jira MCP is unavailable, ask the user to provide the refined story directly.
- If `$ARGUMENTS` contains the complete story, use it directly without Jira.

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