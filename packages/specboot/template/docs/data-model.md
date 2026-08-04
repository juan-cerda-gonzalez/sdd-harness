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

No project-specific persistent data model has been defined yet.

The data model will be created incrementally through approved OpenSpec changes.

When the project does not use persistent storage, document that decision explicitly in this section.

Example:

- The application currently has no database.
- Runtime information is stored only in memory.
- In-memory information is lost when the application process restarts.
- Secrets, credentials, and tokens are never persisted by the application.
- External systems remain the source of truth for their own data.

---

## Persistence Technologies

Document only technologies that are currently approved and in use.

| Purpose | Technology | Status | Notes |
|---|---|---|---|
| Primary database | Not defined | Pending | Define through an approved OpenSpec change |
| Cache | Not defined | Pending | Document whether it is local or distributed |
| File storage | Not defined | Pending | Define ownership, access, and retention |
| Messaging or event store | Not defined | Pending | Define only when required |
| Search index | Not defined | Pending | Define source of truth and synchronization |
| External source of truth | Not defined | Pending | Document systems whose data is consumed but not owned |

Agents and developers must not infer a database, ORM, cache, file-storage provider, messaging platform, or search technology when one has not been approved.

---

## Domain Entities

Document each implemented or approved domain entity using the following structure.

### Entity: `<EntityName>`

#### Purpose

Describe what the entity represents in the business domain.

#### Ownership and source of truth

- **Owning service or bounded context:** `<name>`
- **Source of truth:** `<system or component>`
- **Persistence:** `<table, collection, memory, file, external system, or none>`
- **Lifecycle owner:** `<component or team>`

#### Fields

| Field | Type | Required | Default | Sensitive | Description |
|---|---|---:|---|---:|---|
| `id` | `<type>` | Yes | Generated | No | Unique identifier |

#### Validation rules

- Define required formats, ranges, lengths, and business invariants.
- Distinguish application validation from database constraints.
- Specify whether empty strings are allowed.
- Specify whether null and undefined are valid.
- Define units for numeric values.
- Define timezone and precision rules for dates.
- Do not use ambiguous descriptions such as “valid value” without defining validity.

#### Relationships

- Describe cardinality.
- Identify ownership.
- Identify foreign keys or logical references.
- Define cascade behavior when applicable.
- Define deletion, deactivation, and orphan behavior.
- Define whether the relationship is mandatory or optional.

#### Indexes and constraints

- Primary keys
- Unique constraints
- Foreign keys
- Composite indexes
- Search indexes
- Check constraints
- Partition keys
- Tenant-isolation constraints

#### Lifecycle

- Creation
- Updates
- Status transitions
- Deactivation
- Deletion
- Retention
- Archival
- Recovery or restoration

#### Audit requirements

Document when applicable:

- creation timestamp;
- last modification timestamp;
- creating user or service;
- modifying user or service;
- version or concurrency field;
- business-event history;
- deletion or deactivation reason.

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