# Data Model

## Purpose

This document describes the current data model and persistence decisions of the project.

It is an evolving source of truth and must be updated whenever an approved OpenSpec change introduces, modifies, or removes:

- persistent entities;
- database tables or collections;
- fields or attributes;
- relationships;
- indexes;
- constraints;
- enumerations;
- cache structures;
- stored files;
- events or messages that form part of a persistent data contract;
- external data contracts consumed by the project.

This document must describe only the model currently implemented or explicitly approved.

Do not document hypothetical entities, fields, relationships, or persistence technologies as if they already existed.

---

## Current State

The project has one persistent domain entity, `Activity`, backed by a PostgreSQL database hosted on Supabase and accessed via Prisma. This was introduced by the `create-crud-endpoint` OpenSpec change (VN-4175) and is the first persistence layer in this project.

The data model will continue to be extended incrementally through approved OpenSpec changes.

---

## Persistence Technologies

Document only technologies that are currently approved and in use.

| Purpose | Technology | Status | Notes |
|---|---|---|---|
| Primary database | PostgreSQL (Supabase) via Prisma | Active | `backend/prisma/schema.prisma`; connection via `DATABASE_URL` (pooled) / `DIRECT_URL` (migrations) |
| Cache | Not defined | Pending | Document whether it is local or distributed |
| File storage | Not defined | Pending | Define ownership, access, and retention |
| Messaging or event store | Not defined | Pending | Define only when required |
| Search index | Not defined | Pending | Define source of truth and synchronization |
| External source of truth | Not defined | Pending | Document systems whose data is consumed but not owned |

Agents and developers must not infer a database, ORM, cache, file-storage provider, messaging platform, or search technology when one has not been approved.

---

## Domain Entities

Document each implemented or approved domain entity using the following structure.

### Entity: `Activity`

#### Purpose

Represents an "actividad" (activity) — a maintainer entity used to categorize/tag other records in the system. Introduced by VN-4175 as the project's first persistent entity.

#### Ownership and source of truth

- **Owning service or bounded context:** `activities-management` (backend)
- **Source of truth:** PostgreSQL (Supabase) via Prisma
- **Persistence:** table `activities`
- **Lifecycle owner:** `backend/src/application/services/activityService.ts`

#### Fields

| Field | Type | Required | Default | Sensitive | Description |
|---|---|---:|---|---:|---|
| `id` | `Int` (autoincrement) | Yes | Generated | No | Unique identifier |
| `name` | `varchar(100)` | Yes | — | No | Display name of the activity |
| `active` | `boolean` | Yes | `true` | No | Soft-delete flag; `false` = inactive |
| `createdAt` | `timestamp` | Yes | `now()` | No | Creation timestamp |
| `updatedAt` | `timestamp` | Yes | Auto-updated | No | Last modification timestamp |
| `createdBy` | `text` | No | `null` | No | Identifier of the creating caller; unpopulated until an auth/identity layer exists (see Non-Goals) |

#### Validation rules

- `name` is required, must be a non-empty string after trimming, and must not exceed 100 characters (application layer, `backend/src/application/validator.ts`).
- `name` uniqueness is case-insensitive and enforced both at the application layer (pre-check) and at the database layer (unique index on `lower(name)`), to close the race-condition window between check and write.
- `active` must be a boolean when provided to the status-toggle endpoint.
- Empty strings for `name` are not allowed. `null`/`undefined` for `name` are not allowed on create/update.

#### Relationships

None. `Activity` has no relationships to other entities in this change.

#### Indexes and constraints

- Primary key: `id`
- Non-unique index: `name` (supports `ILIKE`/`contains` search)
- Unique constraint: case-insensitive unique index on `lower(name)` (`activities_name_lower_key`), hand-written in the migration since Prisma schema syntax has no expression-index support

#### Lifecycle

- **Creation:** via `POST /api/activities`; `active` defaults to `true`.
- **Updates:** name-only rename via `PUT /api/activities/{id}`.
- **Status transitions:** `active` ⇄ `inactive` via `PATCH /api/activities/{id}/status` (soft delete/reactivate).
- **Deletion:** no physical delete endpoint exists; deactivation (`active: false`) is the only removal mechanism.
- **Retention / Archival / Recovery:** not applicable — records are never physically removed by the application.

#### Audit requirements

- `createdAt` and `updatedAt` are tracked automatically.
- `createdBy` is present in the schema for future use but is not populated by this change, since no authorization/identity layer exists yet (tracked as an explicit follow-up dependency in `openspec/changes/create-crud-endpoint/proposal.md`).

---

## Value Objects

Document value objects that form part of the domain model.

### Value Object: `<ValueObjectName>`

#### Purpose

Describe the concept represented by the value object.

#### Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `<field>` | `<type>` | Yes | Description |

#### Rules

- Validation rules
- Equality rules
- Immutability requirements
- Serialization format
- Normalization rules
- Allowed operations

Value objects must not be modeled as entities unless they require a distinct identity and lifecycle.

---

## Enumerations

Document enumerations that form part of a persisted or public data contract.

### Enumeration: `<EnumerationName>`

| Value | Meaning | Allowed transitions or usage |
|---|---|---|
| `<VALUE>` | Description | Context |

For status enumerations, also document allowed transitions.

Example:

| Current status | Allowed next statuses |
|---|---|
| `DRAFT` | `ACTIVE`, `CANCELLED` |
| `ACTIVE` | `SUSPENDED`, `COMPLETED`, `CANCELLED` |
| `COMPLETED` | None |

Do not add an enumeration value without reviewing backward compatibility and existing persisted records.

---

## Relationships

Describe cross-entity relationships that are not sufficiently clear in the individual entity sections.

Example:

```text
Customer 1 ─── N Order
Order    1 ─── N OrderItem