## ADDED Requirements

### Requirement: Create a new activity
The system MUST expose `POST /api/activities` accepting `{ "name": string }`. The system MUST validate that `name` is present, non-empty after trimming, and at most 100 characters. The system MUST reject creation when an active or inactive activity with the same name already exists (case-insensitive comparison) by returning HTTP 409. On success, the system MUST persist the activity with `active: true` and `createdBy: null`, and return HTTP 201 with the created resource.

#### Scenario: Successful creation
- **WHEN** a client sends `POST /api/activities` with `{ "name": "Nueva Actividad" }` and no existing activity has that name
- **THEN** the system returns HTTP 201 with the created activity, including a generated `id`, `name: "Nueva Actividad"`, and `active: true`

#### Scenario: Missing name is rejected
- **WHEN** a client sends `POST /api/activities` with `{}` or `{ "name": "" }`
- **THEN** the system returns HTTP 400 with a validation error and does not persist any record

#### Scenario: Name exceeding the maximum length is rejected
- **WHEN** a client sends `POST /api/activities` with a `name` longer than 100 characters
- **THEN** the system returns HTTP 400 with a validation error and does not persist any record

#### Scenario: Duplicate name is rejected regardless of case
- **WHEN** a client sends `POST /api/activities` with `{ "name": "Ventas" }` and an activity named "ventas" already exists
- **THEN** the system returns HTTP 409 and does not create a duplicate record

#### Scenario: Concurrent duplicate creation is rejected by the database constraint
- **WHEN** two concurrent `POST /api/activities` requests with the same `name` (case-insensitive) both pass the application-layer duplicate pre-check before either write completes
- **THEN** exactly one request succeeds with HTTP 201 and the other fails with HTTP 409, translated from the database's unique-constraint violation rather than a raw HTTP 500
