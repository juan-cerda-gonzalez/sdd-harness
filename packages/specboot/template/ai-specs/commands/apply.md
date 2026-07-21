Use the `openspec-apply-change` skill to implement the following OpenSpec change:

$ARGUMENTS

## Input handling

Expected format:

`/apply <change-name>`

Example:

`/apply create-auth-service`

## Execution rules

1. Read `openspec/config.yaml`.
2. Read all artifacts under `openspec/changes/<change-name>/`.
3. Confirm that all required artifacts are complete.
4. Execute the tasks from `tasks.md` in order.
5. Mark each task as completed only after it has actually been implemented and verified.
6. Run the required tests and validations defined in `tasks.md`.
7. Update technical documentation when required by the change.
8. Do not archive the change.
9. Do not commit or push changes.
10. Do not modify Jira unless explicitly requested.

## Safety

- Never expose or commit secrets.
- Use mocks for unit tests.
- Real credentials may only be read from the local environment or secret manager.
- Stop and report blockers if required credentials, dependencies, or external services are unavailable.
- Do not falsely mark manual or integration verification as complete when it could not be executed.

## Final response

Report:

- implemented tasks;
- pending or blocked tasks;
- files created or modified;
- tests executed and their results;
- documentation updated;
- final OpenSpec status.