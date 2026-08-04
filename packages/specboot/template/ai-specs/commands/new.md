Use the `openspec-propose` skill to create a complete OpenSpec change from the following input:

$ARGUMENTS

## Usage

Supported formats:

`/new <jira-issue-key>`

Example:

`/new VN-3878`

The Jira issue is used as the source and the OpenSpec change name is generated from the refined story.

`/new <jira-issue-key> <change-name>`

Example:

`/new VN-3878 create-auth-services`

The Jira issue is used as the source and the provided change name is used exactly.

`/new <complete-story>`

Example:

`/new As an internal service, I need to acquire and cache an Azure B2C access token so outbound integrations can authenticate securely.`

The complete story is used directly without Jira.

## Argument parsing

1. Detect whether `$ARGUMENTS` contains a Jira issue key matching a pattern such as:

   `[A-Z][A-Z0-9]+-\d+`

2. If a Jira issue key is found:
   - treat the Jira issue key as the source issue;
   - if additional text follows the Jira issue key, treat that text as the requested OpenSpec change name;
   - validate that the requested change name uses kebab-case;
   - do not generate a different change name when the user explicitly provides one.

3. If a Jira issue key is found without a change name:
   - read the refined Jira issue;
   - generate a concise kebab-case change name from the refined story.

4. If no Jira issue key is found:
   - treat `$ARGUMENTS` as the complete story;
   - do not query Jira;
   - generate a concise kebab-case change name from the story.

5. If the supplied change name is not valid kebab-case:
   - stop;
   - report the invalid value;
   - suggest a corrected name;
   - do not create the change until the name is resolved.

## Input handling

- If `$ARGUMENTS` contains a Jira issue key, read the refined issue using the configured Jira MCP.
- Jira access must be read-only during this workflow.
- If Jira MCP is unavailable, ask the user to provide the refined story directly.
- If `$ARGUMENTS` contains the complete story, use it directly without Jira.
- When both a Jira issue key and a change name are provided:
  - use the Jira issue as the source;
  - use the provided change name exactly;
  - do not infer or replace the requested name.
- Do not infer a Jira issue only from:
  - the current branch name;
  - prior conversation context;
  - a commit message;
  - an OpenSpec change name.

## Project context

Before creating the change:

1. Confirm the current working directory is the project root.
2. Confirm the project root contains:
   - `openspec/`;
   - `docs/`.
3. Read `openspec/config.yaml`.
4. Apply the project documentation referenced in that configuration.
5. Review relevant existing specifications under `openspec/specs/`.
6. Follow the complete workflow defined by the `openspec-propose` skill.

## Clarification rules

Before generating final planning artifacts, identify unresolved or ambiguous requirements.

Ask for clarification when the source does not clearly define:

- expected behavior;
- acceptance criteria;
- input and output contracts;
- authentication or authorization;
- whether an endpoint or controller is required;
- whether an endpoint is permanent or development-only;
- error handling;
- environment restrictions;
- external dependencies;
- security requirements;
- data persistence;
- retry, timeout, or cache behavior;
- backward compatibility;
- test expectations.

Do not silently infer behavior that materially changes the implementation.

If a clarification cannot be resolved:

- record it as an open question in `design.md`;
- add a blocked task in `tasks.md`;
- do not present the unresolved behavior as approved.

## Expected result

Create all planning artifacts required by the configured OpenSpec schema:

- `proposal.md`;
- `design.md`;
- `specs/**/*.md`;
- `tasks.md`.

Continue through the artifact dependency order until all planning artifacts are complete.

The expected location is:

`openspec/changes/<change-name>/`

## Artifact requirements

### proposal.md

Must describe:

- source Jira issue or direct story;
- problem;
- objective;
- scope;
- out-of-scope items;
- affected capabilities;
- dependencies;
- risks;
- assumptions.

### design.md

Must describe:

- technical approach;
- architecture and affected layers;
- configuration;
- external integrations;
- validation;
- error handling;
- security;
- observability;
- retry, timeout, or caching decisions when applicable;
- test strategy;
- deployment or environment considerations;
- unresolved questions.

### specs/**/*.md

Must define observable behavior using explicit requirements and scenarios.

Requirements must use clear normative language such as:

- `MUST`;
- `MUST NOT`;
- `SHOULD`, only when optional behavior is intentional.

Scenarios should define:

- GIVEN;
- WHEN;
- THEN.

Avoid ambiguous terms such as:

- normally;
- when possible;
- should work;
- in development;
- appropriate;
- as needed;

unless they are explicitly defined.

### tasks.md

Must include:

- implementation tasks;
- configuration tasks;
- tests;
- documentation;
- manual or integration validation;
- security prerequisites;
- external dependencies;
- blocked tasks;
- build and verification steps.

Tasks must not be marked complete during `/new`.

## Status validation

After creating the artifacts, run:

`openspec status --change "<change-name>"`

Do not stop until all required planning artifacts are reported as complete, unless an artifact is blocked by an unresolved user decision or unavailable external information.

## Restrictions

- Do not implement application code.
- Do not execute `openspec-apply-change`.
- Do not modify Jira.
- Do not archive the change.
- Do not create a Git commit.
- Do not push.
- Do not create a Pull Request.
- Do not modify `packages/specboot/template/` unless the requested change explicitly affects the reusable template.
- Do not include credentials, tokens, secrets, or sensitive Jira content in generated artifacts.
- Do not mark implementation tasks as completed.

## Final response

Report:

- generated change name;
- source Jira issue or direct input;
- generated artifact paths;
- final result of:

  `openspec status --change "<change-name>"`

- unresolved questions;
- blocked artifacts or tasks;
- recommended next command.

The recommended next command should normally be:

`/apply <change-name>`

but only when all required planning artifacts are complete and the unresolved questions do not prevent implementation.