## ADDED Requirements

### Requirement: List activities with search and pagination
The system MUST expose `GET /api/activities` returning a paginated list of activities with fields `id`, `name`, `active`, and pagination metadata (`total`, `page`, `limit`, `totalPages`). The `search` query parameter MUST perform a case-insensitive partial match against `name`. The `limit` parameter MUST default to 10 and MUST NOT exceed 10. The `page` parameter MUST default to 1.

#### Scenario: List without filters returns first page
- **WHEN** a client sends `GET /api/activities` with no query parameters
- **THEN** the system returns HTTP 200 with up to 10 activities, `page: 1`, `limit: 10`, and a `total` matching the full unfiltered record count

#### Scenario: Search filters by partial, case-insensitive name match
- **WHEN** a client sends `GET /api/activities?search=venta` and an activity named "Venta Nueva" exists
- **THEN** the system returns HTTP 200 including that activity in `data`

#### Scenario: Search with no matches returns an empty list
- **WHEN** a client sends `GET /api/activities?search=zzzznotfound`
- **THEN** the system returns HTTP 200 with an empty `data` array and `total: 0`

#### Scenario: Requested limit above the maximum is capped
- **WHEN** a client sends `GET /api/activities?limit=50`
- **THEN** the system returns HTTP 200 with `limit: 10` and at most 10 records in `data`

#### Scenario: Page beyond the last page returns an empty list
- **WHEN** a client requests a `page` number greater than `totalPages`
- **THEN** the system returns HTTP 200 with an empty `data` array and the correct `total`/`totalPages`

### Requirement: Create a new activity
The system MUST expose `POST /api/activities` accepting `{ "name": string }`. The system MUST validate that `name` is present, non-empty, and at most 100 characters. The system MUST reject creation when an active or inactive activity with the same name already exists (case-insensitive comparison) by returning HTTP 409. On success, the system MUST persist the activity with `active: true` and return HTTP 201 with the created resource.

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

### Requirement: Update an activity's name
The system MUST expose `PUT /api/activities/{id}` accepting `{ "name": string }`. The system MUST return HTTP 404 when `id` does not correspond to an existing activity. The system MUST apply the same `name` validation rules as creation (required, max 100 characters). The system MUST return HTTP 409 when another activity (different `id`) already has the same name, case-insensitive. On success, the system MUST update the `updatedAt` audit field and return HTTP 200 with the updated resource.

#### Scenario: Successful rename
- **WHEN** a client sends `PUT /api/activities/{id}` with `{ "name": "Nombre Actualizado" }` for an existing activity and no other activity has that name
- **THEN** the system returns HTTP 200 with `name: "Nombre Actualizado"` and an updated `updatedAt` value

#### Scenario: Update of a non-existent activity
- **WHEN** a client sends `PUT /api/activities/{id}` where `id` does not exist
- **THEN** the system returns HTTP 404 and does not modify any record

#### Scenario: Rename to a name used by another activity is rejected
- **WHEN** a client sends `PUT /api/activities/{id}` with a `name` already used by a different activity
- **THEN** the system returns HTTP 409 and does not modify the record

#### Scenario: Renaming an activity to its own current name is allowed
- **WHEN** a client sends `PUT /api/activities/{id}` with the activity's own current `name` unchanged
- **THEN** the system returns HTTP 200 without raising a duplicate-name conflict

### Requirement: Toggle activity active status (soft delete)
The system MUST expose `PATCH /api/activities/{id}/status` accepting `{ "active": boolean }`. The system MUST return HTTP 404 when `id` does not correspond to an existing activity. On success, the system MUST persist the new `active` value immediately and return HTTP 200 with the updated resource. The system MUST NOT provide a physical delete endpoint for activities.

#### Scenario: Deactivate an active activity
- **WHEN** a client sends `PATCH /api/activities/{id}/status` with `{ "active": false }` for an active activity
- **THEN** the system returns HTTP 200 with `active: false`, and the change is immediately visible on subsequent `GET` requests

#### Scenario: Reactivate an inactive activity
- **WHEN** a client sends `PATCH /api/activities/{id}/status` with `{ "active": true }` for an inactive activity
- **THEN** the system returns HTTP 200 with `active: true`

#### Scenario: Status toggle on a non-existent activity
- **WHEN** a client sends `PATCH /api/activities/{id}/status` where `id` does not exist
- **THEN** the system returns HTTP 404 and does not modify any record

### Requirement: Export filtered activities as an Excel file
The system MUST expose `GET /api/activities/export` accepting the same `search` filter as the list endpoint. The system MUST stream a valid `.xlsx` file containing the filtered result set without pagination limits, without buffering the complete file in memory before starting the response. The exported rows MUST use the same filter logic as `GET /api/activities`.

#### Scenario: Export with no filter returns all activities
- **WHEN** a client sends `GET /api/activities/export` with no `search` parameter
- **THEN** the system returns HTTP 200 with `Content-Type` for `.xlsx` and a streamed file containing every activity

#### Scenario: Export respects the search filter
- **WHEN** a client sends `GET /api/activities/export?search=venta`
- **THEN** the returned `.xlsx` file contains only activities whose `name` matches the filter, consistent with what `GET /api/activities?search=venta` would return

#### Scenario: Export failure returns an error, not a partial file
- **WHEN** an unexpected error occurs while generating the export (e.g. database failure) before the stream has started
- **THEN** the system returns a standard JSON error response instead of a corrupt or partial `.xlsx` stream

### Requirement: Standard error response envelope
All error responses from activity endpoints MUST follow the project-standard envelope: `{ "success": false, "error": { "message": string, "code": string } }`. Validation errors MUST use HTTP 400, not-found errors MUST use HTTP 404, and duplicate-name conflicts MUST use HTTP 409.

#### Scenario: Validation error envelope
- **WHEN** any activity endpoint rejects a request due to invalid input
- **THEN** the response body matches `{ "success": false, "error": { "message": string, "code": string } }` with HTTP 400

#### Scenario: Not-found error envelope
- **WHEN** any activity endpoint rejects a request because the `id` does not exist
- **THEN** the response body matches `{ "success": false, "error": { "message": string, "code": string } }` with HTTP 404
