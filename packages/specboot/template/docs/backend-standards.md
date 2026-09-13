---
description: Backend development standards, best practices, and conventions for the LTI Node.js/TypeScript/Express application including Domain-Driven Design, SOLID principles, architecture patterns, API design, and testing practices
globs: ["backend/src/**/*.ts", "backend/prisma/**/*.{prisma,ts}", "backend/jest.config.js", "backend/tsconfig.json", "backend/serverless.yml", "backend/package.json"]
alwaysApply: true
---

# Backend Project Standards and Best Practices

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
  - [Core Technologies](#core-technologies)
  - [Database & ORM](#database--orm)
  - [Testing Framework](#testing-framework)
  - [Development Tools](#development-tools)
- [Architecture Overview](#architecture-overview)
  - [Domain-Driven Design (DDD)](#domain-driven-design-ddd)
  - [Layered Architecture](#layered-architecture)
  - [Project Structure](#project-structure)
- [Domain-Driven Design Principles](#domain-driven-design-principles)
  - [Entities](#entities)
  - [Value Objects](#value-objects)
  - [Aggregates](#aggregates)
  - [Repositories](#repositories)
  - [Domain Services](#domain-services)
  - [Additional Recommendations](#additional-recommendations)
- [SOLID and DRY Principles](#solid-and-dry-principles)
  - [Single Responsibility Principle (SRP)](#single-responsibility-principle-srp)
  - [Open/Closed Principle (OCP)](#openclosed-principle-ocp)
  - [Liskov Substitution Principle (LSP)](#liskov-substitution-principle-lsp)
  - [Interface Segregation Principle (ISP)](#interface-segregation-principle-isp)
  - [Dependency Inversion Principle (DIP)](#dependency-inversion-principle-dip)
  - [DRY (Don't Repeat Yourself)](#dry-dont-repeat-yourself)
- [Coding Standards](#coding-standards)
  - [Language and Naming Conventions](#language-and-naming-conventions)
  - [TypeScript Usage](#typescript-usage)
  - [Error Handling](#error-handling)
  - [Validation Patterns](#validation-patterns)
      - [Input Normalization](#input-normalization)
  - [Logging Standards](#logging-standards)
- [API Design Standards](#api-design-standards)
  - [REST Endpoints](#rest-endpoints)
  - [Request/Response Patterns](#requestresponse-patterns)
  - [Error Response Format](#error-response-format)
  - [CORS Configuration](#cors-configuration)
- [Database Patterns](#database-patterns)
  - [Database Constraint Error Translation](#database-constraint-error-translation)
  - [Prisma Schema](#prisma-schema)
  - [Migrations](#migrations)
  - [Repository Pattern](#repository-pattern)
- [Testing Standards](#testing-standards)
  - [Unit Testing](#unit-testing)
  - [Integration Testing](#integration-testing)
  - [Manual Endpoint Verification](#manual-endpoint-verification)
  - [Test Coverage Requirements](#test-coverage-requirements)
  - [Mocking Standards](#mocking-standards)
- [Performance Best Practices](#performance-best-practices)
  - [Database Query Optimization](#database-query-optimization)
  - [Async/Await Patterns](#asyncawait-patterns)
  - [Error Handling Performance](#error-handling-performance)
- [Security Best Practices](#security-best-practices)
  - [Input Validation](#input-validation)
  - [Environment Variables](#environment-variables)
  - [Dependency Injection](#dependency-injection)
- [Development Workflow](#development-workflow)
  - [Git Workflow](#git-workflow)
  - [Development Scripts](#development-scripts)
  - [Code Quality](#code-quality)
  - [Implementation Quality Gate](#implementation-quality-gate)
- [Serverless Deployment](#serverless-deployment)
  - [AWS Lambda Configuration](#aws-lambda-configuration)
  - [Serverless Framework](#serverless-framework)

---

## Overview

This document outlines the best practices, conventions, and standards used in the LTI backend application. The backend follows Domain-Driven Design (DDD) principles and implements a layered architecture to ensure code consistency, maintainability, and scalability.

## Technology Stack

### Core Technologies
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development with strict mode
- **Express.js**: Web application framework
- **Prisma**: Modern ORM for database access

### Database & ORM
- **PostgreSQL**: Relational database (Docker container)
- **Prisma Client**: Type-safe database client
- **Prisma Migrate**: Database migration tool

### Testing Framework
- **Jest**: Testing framework with TypeScript support
- **Coverage Requirements**: See Test Coverage Requirements
- **Test Location**: `backend/src/_test/`, mirroring the production source structure

### Development Tools
- **ESLint**: Code linting
- **TypeScript Compiler**: Type checking and compilation
- **Serverless Framework**: AWS Lambda deployment support

## Architecture Overview

### Domain-Driven Design (DDD)

Domain-Driven Design is a methodology that focuses on modeling software according to business logic and domain knowledge. By centering development on a deep understanding of the domain, DDD facilitates the creation of complex systems.

**Benefits:**
- **Improved Communication**: Promotes a common language between developers and domain experts, improving communication and reducing interpretation errors.
- **Clear Domain Models**: Helps build models that accurately reflect business rules and processes.
- **High Maintainability**: By dividing the system into subdomains, it facilitates maintenance and software evolution.

### Layered Architecture

The backend follows a layered DDD architecture:

**Presentation Layer** (`src/presentation/`)
- Controllers handle HTTP requests/responses
- Routes define API endpoints
- Controllers use services from Application layer

**Application Layer** (`src/application/`)
- Application services orchestrate use cases.
- Application services coordinate domain objects and repository abstractions.
- Domain business rules belong in domain entities, value objects, or domain services when appropriate.
- Application services must not depend directly on Prisma or infrastructure implementations.

**Domain Layer** (`src/domain/`)
- Models define core business entities (Candidate, Position, Application, Interview, etc.)
- Repository interfaces define data access contracts
- Pure business logic without external dependencies

**Infrastructure Layer** (implicit)
- Prisma ORM handles database operations
- Repository implementations (via Prisma) satisfy domain interfaces

### Project Structure

```
backend/
├── src/
│   ├── domain/
│   │   ├── models/          # Domain entities
│   │   └── repositories/    # Repository interfaces
│   ├── application/
│   │   ├── services/        # Business logic services
│   │   └── validator.ts     # Input validation
│   ├── presentation/
│   │   └── controllers/     # HTTP request handlers
│   ├── infrastructure/
│   │   ├── logger.ts        # Logging utilities
│   │   └── prismaClient.ts  # Prisma client setup
│   ├── routes/              # Express route definitions
│   ├── middleware/          # Express middleware
│   ├── index.ts             # Application entry point
│   └── lambda.ts            # AWS Lambda handler
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── test-utils/
│   ├── builders/            # Test data builders
│   └── mocks/               # Mock helpers
├── jest.config.js           # Jest configuration
├── tsconfig.json            # TypeScript configuration
├── serverless.yml           # Serverless Framework config
└── package.json             # Dependencies and scripts
```

## Domain-Driven Design Principles

### Entities

Entities are objects with a distinct identity that persists over time.

**Before:**
```typescript
// Previously, candidate data might have been handled as a simple JSON object without methods.
const candidate = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
};
```

**After:**
```typescript
export class Candidate {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    
    // Constructor and methods that encapsulate business logic
    constructor(data: any) {
        this.id = data.id;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
    }
}
```

**Explanation**: `Candidate` is an entity because it has a unique identifier (`id`) that distinguishes it from other candidates, even if other properties are identical.

**Best Practice**: Entities should encapsulate business logic related to their domain concept and maintain consistency of their internal state.

### Value Objects

Value Objects describe aspects of the domain without conceptual identity. They are defined by their attributes rather than an identifier.

**Before:**
```typescript
// Handling education information as a simple object
const education = {
    institution: 'University',
    degree: 'Bachelor',
    startDate: '2010-01-01',
    endDate: '2014-01-01'
};
```

**After:**
```typescript
export class Education {
    institution: string;
    title: string;
    startDate: Date;
    endDate?: Date;
    
    constructor(data: any) {
        this.institution = data.institution;
        this.title = data.title;
        this.startDate = new Date(data.startDate);
        this.endDate = data.endDate ? new Date(data.endDate) : undefined;
    }
}
```

**Explanation**: `Education` can be considered a Value Object in some contexts, as it describes a candidate's education without needing a unique identifier. However, in the current model, it has been assigned an id, which could contradict the pure definition of a Value Object in DDD.

**Recommendation**: Classes like `Education` and `WorkExperience` currently have unique identifiers, classifying them as entities. In many cases, these could be treated as Value Objects within the context of a `Candidate` aggregate. Consider removing unique identifiers from classes that should be Value Objects, or incorporating them as part of the Candidate document if using a NoSQL database.

### Aggregates

Aggregates are clusters of objects that must be treated as a unit. They have a root entity that enforces invariants and consistency boundaries.

**Before:**
```typescript
// Candidate and education data handled separately
const candidate = { id: 1, name: 'John Doe' };
const educations = [{ candidateId: 1, institution: 'University' }];
```

**After:**
```typescript
export class Candidate {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    educations: Education[];
    
    constructor(data: any) {
        this.id = data.id;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.educations = data.educations?.map(edu => new Education(edu)) || [];
    }
}
```

**Explanation**: `Candidate` acts as an aggregate root that contains `Education`, `WorkExperience`, `Resume`, and `Application`. `Candidate` is the root of the aggregate, as the other entities only make sense in relation to a candidate.

**Recommendation**: Aggregates should be carefully designed to ensure that all operations within the aggregate boundary maintain consistency. Operations that affect `Education` and `WorkExperience` should be handled through the aggregate root, `Candidate`, to maintain integrity and encapsulation.

### Repositories

Repositories provide interfaces for accessing aggregates and entities, encapsulating data access logic.

**Before:**
```typescript
// Direct database access without abstraction
function getCandidateById(id: number) {
    return database.query('SELECT * FROM candidates WHERE id = ?', [id]);
}
```

**After:**
```typescript
export interface ICandidateRepository {
    findById(id: number): Promise<Candidate | null>;
    save(candidate: Candidate): Promise<Candidate>;
    findAll(): Promise<Candidate[]>;
}

export class CandidateRepository implements ICandidateRepository {
    async findById(id: number): Promise<Candidate | null> {
        const data = await prisma.candidate.findUnique({ where: { id } });
        return data ? new Candidate(data) : null;
    }
    
    async save(candidate: Candidate): Promise<Candidate> {
        // Implementation with Prisma
    }
}
```

**Explanation**: `CandidateRepository` provides a clear interface for accessing candidate data, encapsulating database access logic.

**Recommendation**: 
- Develop complete repository interfaces for each entity and aggregate, ensuring all database interactions for those entities pass through the repository
- Implement repository methods that handle collections of entities, such as lists of Candidates, that can be filtered or modified in bulk
- Use dependency injection to inject Prisma client into repositories

### Domain Services

Domain Services contain business logic that doesn't naturally belong to an entity or value object.

**Before:**
```typescript
// Loose functions to handle business logic
function calculateAge(candidate: any): number {
    const today = new Date();
    const birthDate = new Date(candidate.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
```

**After:**
```typescript
export class CandidateService {
    static calculateAge(candidate: Candidate): number {
        const today = new Date();
        const birthDate = new Date(candidate.birthDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
}
```

**Explanation**: `CandidateService` encapsulates business logic related to candidates, such as calculating age, providing a centralized and coherent point for handling these operations.

### Additional Recommendations

### Optional DDD Patterns

Factories, domain events, aggregates, and domain services may be introduced when they solve a concrete domain requirement.

- Do not introduce these patterns solely for architectural purity.
- Prefer the simplest design that preserves domain invariants.
- Do not redesign existing aggregate boundaries unless required by the approved OpenSpec change.
- New architectural abstractions must have a concrete use case.

## SOLID and DRY Principles

### SOLID Principles

SOLID principles are five object-oriented design principles that help create more understandable, flexible, and maintainable systems.

#### Single Responsibility Principle (SRP)

Each class should have a single responsibility or reason to change.

**Before:**
```typescript
// A method that handles multiple responsibilities: validation and data storage
function processCandidate(candidate: any) {
    if (!candidate.email.includes('@')) {
        console.error('Invalid email');
        return;
    }
    database.save(candidate);
    console.log('Candidate saved');
}
```

**After:**
```typescript
export class Candidate {
    // The class now only handles logic related to the candidate
    validateEmail(): void {
        if (!this.email.includes('@')) {
            throw new Error('Invalid email');
        }
    }
}

export class CandidateRepository {
    async save(candidate: Candidate): Promise<Candidate> {
        candidate.validateEmail();
        return await prisma.candidate.create({ data: candidate });
    }
}
```

**Explanation**: The `Candidate` class now has separate methods for validation, while the repository handles data persistence, complying with the single responsibility principle.

**Observation**: The `Candidate` class in `backend/src/domain/models/Candidate.ts` handles both business logic and data access logic.

**Recommendation**: Separate data access logic into a repository layer to adhere more closely to SRP.

#### Open/Closed Principle (OCP)

Software entities should be open for extension but closed for modification.

**Before:**
```typescript
// Direct modification of the class to add functionality
class Candidate {
    saveToDatabase() {
        // code to save to database
    }
    // To add new functionality, we modify the class directly
    sendEmail() {
        // code to send an email
    }
}
```

**After:**
```typescript
export class Candidate {
    saveToDatabase() {
        // code to save to database
    }
}

// Extend functionality without modifying the existing class
class CandidateWithEmail extends Candidate {
    sendEmail() {
        // code to send an email
    }
}
```

**Explanation**: The email sending functionality is extended in a subclass, keeping the original class closed for modifications but open for extensions.

**Observation**: The `addCandidate` function in `backend/src/application/services/candidateService.ts` directly instantiates `Candidate`, `Education`, `WorkExperience`, and `Resume` classes.

**Recommendation**: Use factory methods to create instances, allowing for easier extension without modifying existing code.

#### Liskov Substitution Principle (LSP)

Objects of a derived class should be replaceable with objects of the base class without altering the program's functionality.

**Before:**
```typescript
// Subclass that cannot completely replace its base class
class TemporaryCandidate extends Candidate {
    saveToDatabase() {
        throw new Error("Temporary candidates can't be saved.");
    }
}
```

**After:**
```typescript
class TemporaryCandidate extends Candidate {
    saveToDatabase() {
        // Appropriate implementation that allows temporary handling
        console.log("Handled temporarily");
        // Alternative: Save to temporary storage
    }
}
```

**Explanation**: `TemporaryCandidate` now provides an appropriate implementation that respects the base class contract, allowing substitution without errors.

**Observation**: Currently, there is no inheritance in use where LSP could be violated. The project uses composition over inheritance, which generally supports LSP.

**Recommendation**: Continue using composition to avoid LSP violations and ensure that any future inheritance structures allow derived classes to substitute their base classes without altering how the program works.

#### Interface Segregation Principle (ISP)

Many specific interfaces are better than a single general interface.

**Before:**
```typescript
// A large interface that small clients don't fully use
interface CandidateOperations {
    save(): void;
    validate(): void;
    sendEmail(): void;
    generateReport(): void;
}
```

**After:**
```typescript
interface SaveOperation {
    save(): void;
}

interface EmailOperations {
    sendEmail(): void;
}

interface ReportOperations {
    generateReport(): void;
}

class Candidate implements SaveOperation, EmailOperations {
    save() {
        // implementation
    }
    
    sendEmail() {
        // implementation
    }
}
```

**Explanation**: Interfaces are segregated into smaller operations, allowing classes to implement only the interfaces they need.

**Observation**: The project does not currently use TypeScript interfaces extensively to enforce contracts for classes.

**Recommendation**: Define more granular interfaces for service classes to ensure they only implement the methods they need.

#### Dependency Inversion Principle (DIP)

High-level modules should not depend on low-level modules; both should depend on abstractions.

**Before:**
```typescript
// Direct dependency on a concrete implementation
class Candidate {
    private database = new PrismaClient();
    
    save() {
        this.database.candidate.create({ data: this });
    }
}
```

**After:**
```typescript
export interface CandidateRepository {
  save(candidate: Candidate): Promise<Candidate>;
}

export class CreateCandidateService {
  constructor(
    private readonly candidateRepository: CandidateRepository,
  ) {}

  async execute(candidate: Candidate): Promise<Candidate> {
    return this.candidateRepository.save(candidate);
  }
}
```

```typescript
export class PrismaCandidateRepository implements CandidateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(candidate: Candidate): Promise<Candidate> {
    // persistence mapping
  }
}
```

**Explanation**: The application service depends on the `CandidateRepository` abstraction rather than on Prisma or another persistence implementation. The domain entity remains persistence-agnostic.

**Recommendation**: Depend on repository abstractions from application services. Keep Prisma-specific dependency injection and persistence mapping inside the infrastructure/composition layer.



### DRY (Don't Repeat Yourself)

The DRY principle focuses on reducing duplication in code. Each piece of knowledge should have a single, unambiguous, and authoritative representation within a system.

**Before:**
```typescript
// Repeated code to validate emails in multiple functions
function saveCandidate(candidate: Candidate) {
    if (!candidate.email.includes('@')) {
        throw new Error('Invalid email');
    }
    // save logic
}

function updateCandidate(candidate: Candidate) {
    if (!candidate.email.includes('@')) {
        throw new Error('Invalid email');
    }
    // update logic
}
```

**After:**
```typescript
export class Candidate {
    validateEmail(): void {
        if (!this.email.includes('@')) {
            throw new Error('Invalid email');
        }
    }
     changeEmail(newEmail: string): void {
    // validate and update domain state
    }

    updateProfile(): void {
        // update domain state
    }
}
```

**Explanation**: Email validation is centralized in the domain entity and reused by domain operations that modify the email, without introducing persistence responsibilities into the entity.

**Recommendation**: Keep reusable business rules in the appropriate domain abstraction and keep repeated persistence logic inside infrastructure repositories.

**Observation**: The methods for saving entities like `Candidate`, `Education`, `WorkExperience`, and `Resume` contain repetitive logic for handling database operations.


## Coding Standards

### Naming Conventions

- **Variable Naming**: Use camelCase for variables and functions (e.g., `candidateId`, `findCandidateById`)
- **Class Naming**: Use PascalCase for classes and interfaces (e.g., `Candidate`, `CandidateRepository`)
- **Constants Naming**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_CANDIDATES_PER_PAGE`)
- **Type Naming**: Use PascalCase for types and interfaces (e.g., `CandidateData`, `ICandidateRepository`)
- **File Naming**: Use camelCase for file names (e.g., `candidateService.ts`, `candidateController.ts`)

**Examples:**

```typescript
// Good: All in English
export class CandidateRepository {
    async findById(candidateId: number): Promise<Candidate | null> {
        // Find candidate by ID in the database
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId }
        });
        return candidate ? new Candidate(candidate) : null;
    }
}

// Avoid: Non-English comments or names
export class RepositorioCandidato {
    async buscarPorId(idCandidato: number): Promise<Candidato | null> {
        // Buscar candidato por ID en la base de datos
        const candidato = await this.prisma.candidate.findUnique({
            where: { id: idCandidato }
        });
        return candidato ? new Candidato(candidato) : null;
    }
}
```

**Error Messages and Logs:**

```typescript
// Good: English error messages
throw new NotFoundError('Candidate not found with the provided ID');
logger.error('Failed to create candidate', { error: error.message });

// Avoid: Non-English messages
throw new NotFoundError('Candidato no encontrado con el ID proporcionado');
logger.error('Error al crear candidato', { error: error.message });
```

### TypeScript Usage

- **Strict Mode**: Always enable strict mode in `tsconfig.json`
- **Type Definitions**: Use explicit types for function parameters and return values
- **Interfaces**: Define interfaces for complex data structures
- **Avoid `any`**: Use `unknown` or specific types instead of `any` when possible

```typescript
// Good: Explicit types
async function findCandidateById(id: number): Promise<Candidate | null> {
    // implementation
}

// Avoid: Using any
function processData(data: any): any {
    // implementation
}
```

### Error Handling

- **Custom Error Classes**: Create domain-specific error classes
- **Error Middleware**: Use global error middleware for consistent error responses
- **Error Messages**: Provide descriptive error messages for debugging

```typescript
export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

// In controller
try {
    const candidate = await candidateService.findById(id);
    if (!candidate) {
        throw new NotFoundError('Candidate not found');
    }
    res.json(candidate);
} catch (error) {
    next(error);
}
```
### External Service Response Validation

- A successful HTTP status does not guarantee a valid business response.
- All responses from external services must validate required fields before being accepted.
- HTTP 2xx responses with missing, empty, or malformed required fields must be treated as failures.
- Application errors must not expose a successful HTTP status code as their own failure status.
- The upstream HTTP status may be preserved separately for diagnostics.
- External-service errors must distinguish between:
  - transport failures;
  - timeout failures;
  - upstream non-success HTTP responses;
  - successful HTTP responses with invalid payloads.
- Tests must cover successful HTTP responses with missing, empty, or malformed required fields.
- Application error status and upstream HTTP status must be modeled separately.
- A malformed HTTP 2xx response must use a non-success application status, such as `502 Bad Gateway`.
- The original upstream HTTP status should be preserved in a separate field such as `upstreamStatusCode`.
- Logs for external-service failures should include both:
  - `statusCode`: application-level failure status;
  - `upstreamStatusCode`: original HTTP status returned by the external service.
- Do not reuse an upstream successful status such as `200` as the application error status.

### Validation Patterns

- **Input Validation**: Validate all inputs at the application layer
- **Use Validator Module**: Centralize validation logic in `src/application/validator.ts`
- **Validate Before Processing**: Always validate before executing business logic

```typescript
import { validateCandidateData } from '../application/validator';

export async function addCandidate(req: Request, res: Response, next: NextFunction) {
    try {
        const validatedData = validateCandidateData(req.body);
        const candidate = await candidateService.create(validatedData);
        res.status(201).json(candidate);
    } catch (error) {
        next(error);
    }
}
```

#### Input Normalization

- Validation and normalization must occur before duplicate checks, business logic, and persistence.
- String values must be normalized once and the normalized value must be reused throughout the operation.
- Leading and trailing whitespace must be removed when whitespace is not meaningful to the domain.
- Validators must return the normalized value instead of validating one value and returning the original unnormalized value.
- Length validation must be applied to the normalized value.
- Duplicate checks must use the same normalized representation that will be persisted.
- Internal whitespace normalization, such as collapsing repeated spaces, must only be applied when explicitly required by the business rule.

Example:

```typescript
export function validateActivityName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new ValidationError('Activity name must be a string');
  }

  const normalizedName = name.trim();

  if (normalizedName.length === 0) {
    throw new ValidationError('Activity name is required');
  }

  if (normalizedName.length > 100) {
    throw new ValidationError(
      'Activity name must not exceed 100 characters',
    );
  }

  return normalizedName;
}
```

### Logging Standards

- **Use Logger Class**: Use the centralized logger from `src/infrastructure/logger.ts`
- **Log Levels**: Use appropriate log levels (info, error, warn, debug)
- **Structured Logging**: Include relevant context in log messages

```typescript
import { Logger } from '../infrastructure/logger';

const logger = new Logger();

logger.info('Candidate created', { candidateId: candidate.id });
logger.error('Failed to create candidate', { error: error.message });
```

## API Design Standards

### REST Endpoints

- **RESTful Naming**: Use RESTful conventions for endpoint naming
- **HTTP Methods**: Use appropriate HTTP methods (GET, POST, PUT, DELETE, PATCH)
- **Resource-Based URLs**: URLs should represent resources, not actions

```typescript
GET    /candidates          // List candidates
GET    /candidates/:id      // Get candidate by ID
POST   /candidates          // Create new candidate
PUT    /candidates/:id      // Update candidate
DELETE /candidates/:id      // Delete candidate
```

### Request/Response Patterns

- **JSON Format**: Use JSON for request and response bodies
- **Consistent Structure**: Maintain consistent response structure across all endpoints
- **Status Codes**: Use appropriate HTTP status codes

```typescript
// Success response
{
    "success": true,
    "data": { ... },
    "message": "Operation completed successfully"
}

// Error response
{
    "success": false,
    "error": {
        "message": "Error description",
        "code": "ERROR_CODE"
    }
}
```

### Error Response Format

- **Consistent Format**: All errors should follow the same response structure
- **Error Codes**: Use meaningful error codes for different error types
- **HTTP Status Codes**: Map errors to appropriate HTTP status codes

```typescript
// 400 Bad Request
{
    "success": false,
    "error": {
        "message": "Validation failed",
        "code": "VALIDATION_ERROR",
        "details": [ ... ]
    }
}

// 404 Not Found
{
    "success": false,
    "error": {
        "message": "Resource not found",
        "code": "NOT_FOUND"
    }
}
```

### CORS Configuration

- **Enable CORS**: Configure CORS to allow frontend origin
- **Secure Configuration**: Only allow specific origins in production
- **Credentials**: Configure credentials handling appropriately

```typescript
import cors from 'cors';

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
};

app.use(cors(corsOptions));
```

## Database Patterns
### Database Constraint Error Translation

- Application-level pre-checks must not be treated as the final guarantee of uniqueness.
- Unique constraints, foreign keys, and other database constraints must remain the authoritative protection against concurrent writes.
- Create and update operations must handle database constraint violations explicitly.
- Known persistence errors must be translated into application or domain errors.
- Raw ORM or database errors must not be returned to API clients.
- A unique-constraint violation must normally be translated to a conflict response such as HTTP `409`.
- Database-specific error codes should be isolated in the infrastructure layer whenever possible.
- Both create and update operations must handle concurrency-related unique-constraint violations.

Example flow:

```text
Application duplicate pre-check
→ repository create/update
→ database unique constraint
→ infrastructure error translation
→ application ConflictError
→ HTTP 409 response
```

### Prisma Schema

- `prisma/schema.prisma` is the canonical application-level schema definition.
- Versioned migrations are the authoritative history of database changes.
- Database constructs not representable by Prisma schema must be defined and documented in version-controlled migrations.
- Relationships representable by Prisma must be defined using Prisma relations.
- Use consistent naming conventions.

### Migrations

- All database changes must be version-controlled through migrations.
- Use descriptive migration names.
- Review generated and custom SQL before applying.
- Do not use `prisma db push` as a replacement for reviewed migrations in shared or production environments.

```bash
# Create migration
npx prisma migrate dev --name descriptive_migration_name

# Apply migrations in production
npx prisma migrate deploy
```

### Repository Pattern

- **Repository Interfaces**: Define repository interfaces in the domain layer
- **Prisma Implementation**: Implement repositories using Prisma in the infrastructure layer
- **Dependency Injection**: Inject Prisma client into repositories

```typescript
// Domain layer interface
export interface ICandidateRepository {
    findById(id: number): Promise<Candidate | null>;
    save(candidate: Candidate): Promise<Candidate>;
}

// Infrastructure layer implementation
export class CandidateRepository implements ICandidateRepository {
    constructor(private prisma: PrismaClient) {}
    
    async findById(id: number): Promise<Candidate | null> {
        const data = await this.prisma.candidate.findUnique({ where: { id } });
        return data ? new Candidate(data) : null;
    }
}
```

## Testing Standards

The project has strict requirements for code quality and maintainability. These are the unit testing standards and best practices that must be applied. 

### Test File Structure

- Use descriptive test file names: `[componentName].test.ts`.
- All unit test files must be centralized under `backend/src/_test/`.
- The structure under `src/_test/` must mirror the production structure under `src/`.
- Do not place tests beside production files.
- Do not create distributed `__tests__` directories.
- Use Jest as the testing framework with TypeScript support.
- **Coverage Requirements**: See Test Coverage Requirements.


### Test Organization Pattern
Template:
```typescript
describe('[ComponentName] - [methodName]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should_[expected_behavior]_when_[condition]', () => {
    it('should [specific test case]', async () => {
      // Arrange
      // Act  
      // Assert
    });
  });
});
```

Real example:
```typescript
describe('CandidateService - findById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return candidate when found', async () => {
        // Arrange
        const candidateId = 1;
        const mockCandidate = new Candidate({ id: 1, firstName: 'John' });
        (CandidateRepository.findById as jest.Mock).mockResolvedValue(mockCandidate);

        // Act
        const result = await candidateService.findById(candidateId);

        // Assert
        expect(result).toEqual(mockCandidate);
        expect(CandidateRepository.findById).toHaveBeenCalledWith(candidateId);
    });
});
```



### Test Case Naming Convention
- Use descriptive, behavior-driven naming: `should_[expected_behavior]_when_[condition]`
- Group related test cases under descriptive `describe` blocks
- Use snake_case for describe blocks and camelCase for individual tests

### Test Structure (AAA Pattern)
Always follow the Arrange-Act-Assert pattern:
```typescript
it('should update candidate stage successfully when valid data provided', async () => {
  // Arrange - Set up test data and mocks
  const candidateId = 1;
  const applicationId = 1;
  const newInterviewStep = 2;
  
  // Act - Execute the function under test
  const result = await updateCandidateStage(candidateId, applicationId, newInterviewStep);
  
  // Assert - Verify the expected behavior
  expect(result).toEqual(expectedResult);
});
```

Assertion pattern:
- Use specific matchers: `toHaveBeenCalledWith()`, `toHaveBeenCalledTimes()`
- Verify both successful operations and error conditions
- Check that mocks were called with correct parameters
- Assert on return values and side effects








### Mocking Standards

- Mock all external dependencies (models, services, database clients)
- Mock repository layers in service tests
- Mock service layers in controller tests
- Use `jest.mock()` at the top of test files for module-level mocking
- Create mock instances with realistic data structures
- Clear all mocks in `beforeEach()` to ensure test isolation


### Test Coverage Requirements

- **Threshold**: 90% for branches, functions, lines, and statements.
- The threshold must be enforced by the backend test configuration.
- Generate coverage reports with `npm run test:coverage`.
- **Coverage Output**: Store generated coverage artifacts in the configured `coverage/` directory.
- **Coverage Summary**: When a human-readable coverage summary is required, generate it as `coverage/YYYYMMDD-backend-coverage.md`.
- Coverage artifacts must remain outside version control unless explicitly required.


### Error Testing
- Test both expected errors and unexpected errors
- Verify error messages are descriptive and helpful
- Test error propagation through service layers
- Ensure proper HTTP status codes in controller tests

### Controller Testing Specifics
- Mock the service layer completely
- Test HTTP request/response handling
- Verify parameter parsing and validation
- Test error response formatting
- Use realistic Express Request/Response mocks

### Service Testing Specifics
- Mock domain models and repositories
- Test business logic in isolation
- Verify data transformation and validation
- Test error handling and edge cases
- Mock external dependencies (Prisma, validators)

### Database Testing
- Mock Prisma client and all database operations
- Test both successful and failed database operations
- Verify correct database queries and parameters
- Test transaction handling and rollback scenarios

### Async Testing
- Always use `async/await` for asynchronous operations
- Use `Promise.allSettled()` for testing concurrent operations
- Properly handle promise rejections in tests
- Test timeout scenarios where applicable

### Test Data Management
- Use factory functions for creating test data
- Keep test data consistent and realistic
- Avoid hardcoded values in multiple places
- Use meaningful test data that reflects real-world scenarios

### Integration Testing

- **Controller Testing**: Test HTTP request/response handling
- **Database Testing**: Test repository implementations with database
- **End-to-End Flow**: Test complete request flows

### Manual Endpoint Verification

For OpenSpec changes that create or modify backend endpoints, the implementing agent must execute the relevant endpoint verification.

Verify when applicable:

- GET endpoints.
- POST endpoints, including cleanup of created data.
- PUT/PATCH endpoints, including restoration of modified data.
- DELETE endpoints, including recreation or restoration when required.
- Validation failures.
- Not-found cases.
- Authentication and authorization failures when applicable.
- Conflict and persistence-error scenarios when applicable.

Requirements:

- The agent must execute the verification itself.
- Do not delegate mandatory endpoint verification to the user.
- Start required local services when necessary.
- Record relevant commands and outcomes when required by `tasks.md`.
- Restore test data and environment state after mutating operations.
- Do not mark the related OpenSpec task complete until required verification passes.

### Code Quality Standards

#### TypeScript Usage
- Use strict typing for all test parameters and return values
- Define proper interfaces for mock data
- Use type assertions sparingly and with proper justification
- Leverage TypeScript's type system for better test reliability

#### Unused Code

- Unused imports, variables, parameters, private members, and dead code are not allowed.
- TypeScript build configurations must enable `noUnusedLocals`.
- TypeScript build configurations should enable `noUnusedParameters`.
- Generated code must compile without unused-code errors.
- Imports must only be added when they are actually used by the module.

#### Documentation
- Write clear, descriptive test names that explain the scenario
- Add comments for complex test setups
- Document any special test conditions or edge cases
- Keep test code as readable as production code

#### Performance Considerations
- Keep tests fast and focused
- Avoid unnecessary async operations in tests
- Use appropriate mock strategies to avoid real I/O
- Group related tests to minimize setup/teardown overhead

### Integration with Development Workflow
- Run tests before every commit
- Ensure all tests pass before merging
- Use test-driven development when appropriate
- Update tests when modifying existing functionality

### Common Anti-Patterns to Avoid
- Don't test implementation details, test behavior
- Don't create overly complex test setups
- Don't ignore failing tests or skip error scenarios
- Don't use real database connections in unit tests
- Don't create tests that depend on external services
- Don't write tests that are too tightly coupled to implementation

### Example Test Structure



## Performance Best Practices

### Database Query Optimization

- **Select Specific Fields**: Only select fields that are needed
- **Use Indexes**: Ensure proper database indexes for frequently queried fields
- **Avoid N+1 Queries**: Use Prisma's `include` to fetch related data efficiently

```typescript
// Good: Fetch related data efficiently
const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
        educations: true,
        workExperiences: true
    }
});

// Avoid: N+1 queries
const candidate = await prisma.candidate.findUnique({ where: { id } });
const educations = await prisma.education.findMany({ where: { candidateId: id } });
```

### Async/Await Patterns

- **Always Use Async/Await**: Use async/await instead of promises chains
- **Error Handling**: Properly handle errors in async operations
- **Parallel Operations**: Use `Promise.all()` for parallel operations when appropriate

```typescript
// Good: Parallel operations
const [candidates, positions] = await Promise.all([
    candidateService.findAll(),
    positionService.findAll()
]);
```

### Error Handling Performance

- **Early Returns**: Return early to avoid unnecessary processing
- **Error Propagation**: Let errors propagate naturally through the call stack
- **Avoid Over-Wrapping**: Don't wrap errors unnecessarily

## Security Best Practices

### Input Validation

- **Validate All Inputs**: Validate all user inputs before processing
- **Sanitize Data**: Sanitize data to prevent injection attacks
- **Type Checking**: Use TypeScript and validation to ensure type safety

### Environment Variables

- **Never Commit Secrets**: Never commit `.env` files or secrets to version control
- **Use Environment Variables**: Use environment variables for configuration
- **Validate Environment**: Validate required environment variables at startup
- Every environment variable must be validated at application startup.
- Numeric environment variables must be explicitly parsed and validated.
- Numeric values must be finite.
- Values that represent durations, retries, limits, or timeouts must be greater than zero unless zero has an explicitly documented meaning.
- Do not use `Number(value)` without validating the result with `Number.isFinite(...)`.
- Invalid configuration must fail fast with a clear error message.
- Default values must be documented in `.env.example`.
- Environment variables representing network ports must be validated at application startup.
- A port value must be:
  - an integer;
  - greater than or equal to `1`;
  - less than or equal to `65535`.
- If the port variable is missing or empty, the documented default may be used.
- If the port variable is explicitly provided but invalid, the application must fail fast.
- Do not silently fall back to the default when an explicitly configured port is invalid.
- Do not pass `NaN`, decimal values, negative values, zero, or values above `65535` to `app.listen()`.

Tests for numeric environment variables must cover:

- missing values;
- valid overrides;
- non-numeric values;
- zero;
- negative values;
- non-finite values;
- decimal values when only integers are allowed.

Tests for network ports must additionally cover:

- missing port and default behavior;
- valid port override;
- value greater than `65535`;
- leading or trailing whitespace.

A validation rule must not be considered complete until all mandatory invalid-value cases are covered by unit tests.

```typescript
// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'PORT'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});
```

### Dependency Injection

- Application services must depend on repository or service abstractions rather than Prisma directly.
- Infrastructure implementations may receive `PrismaClient` through constructor injection.
- Controllers must depend on application services, not on Prisma.
- Composition/bootstrap code is responsible for wiring concrete infrastructure implementations.
- Avoid hidden global dependencies when explicit dependency injection is practical.

Example:

```typescript
const candidateRepository = new PrismaCandidateRepository(prisma);
const createCandidateService = new CreateCandidateService(candidateRepository);
const candidateController = new CandidateController(createCandidateService);

```

## Development Workflow

### Git Workflow

- **Feature Branches**: Backend implementation changes use:
  - `feature/[ticket-id]-backend`, when a ticket ID exists.
  - `feature/[change-name]-backend`, otherwise.
- Branch creation must be the first implementation task when required by the OpenSpec workflow.
- Write descriptive commit messages in English.
- Keep branches small and focused.
- Perform code review before merging.

### Development Scripts

```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production
npm test             # Run tests
npm run test:coverage # Run tests with coverage
npm run prisma:generate  # Generate Prisma client
npx prisma migrate dev   # Create and apply migration
npx prisma db seed       # Seed database
```

### Code Quality

- **ESLint Validation**: Run ESLint before commits
- **TypeScript Compilation**: Ensure TypeScript compiles without errors
- **All Tests Passing**: Ensure all tests pass before deployment
- **Code Review**: Review code for adherence to standards

### Implementation Quality Gate

Before an implementation task is marked as completed:

1. The project must compile successfully.
2. All unit tests must pass.
3. Linting must pass when configured.
4. No unused imports, variables, parameters, or dead code may remain.
5. Environment variables must be validated at application startup.
6. Numeric configuration values must be finite and valid for their intended range.
7. External responses must validate all required payload fields.
8. HTTP 2xx responses with invalid payloads must be treated as failures.
9. New error scenarios and edge cases must include tests.
10. `.env.example` must document every supported environment variable using placeholder values only.
11. No secrets, generated files, coverage output, build output, or dependencies may be staged for commit.
12. Tasks must not be marked `[x]` until these checks pass.
13. New or modified standards must be reflected in the implementation and unit tests within the same change.
14. Do not introduce a mandatory rule in the standards document without adding or updating the tests that prove compliance.
15. External-service error tests must verify both application-level status and upstream status when both are available.
16. All numeric environment variables must be validated for type, finiteness, range, and integer requirements where applicable.
17. Explicitly invalid configuration must fail fast and must not silently fall back to defaults.
18. All persisted strings must use the same normalized value for validation, duplicate checks, and storage.
19. Application-level duplicate checks must be backed by database constraints.
20. Create and update operations must translate database uniqueness violations into application-level conflict errors.
21. Raw ORM or database error messages must never be returned to API clients.
22. Concurrency scenarios must be considered for operations protected by unique constraints.
23. New normalization and constraint-handling behavior must include unit tests.
24. Coverage must meet the configured backend threshold when coverage verification is part of the assigned validation scope.

## Serverless Deployment

### AWS Lambda Configuration

- **Lambda Handler**: Entry point is `src/lambda.ts`
- **Serverless HTTP**: Use `serverless-http` to wrap Express app
- **Environment Variables**: Configure environment variables in `serverless.yml`

### Serverless Framework

- **Configuration File**: `serverless.yml` defines Lambda configuration
- **Build Command**: Use `npm run build:lambda` for Lambda builds
- **Deployment**: Deploy using Serverless Framework CLI

```typescript
// lambda.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverless from 'serverless-http';
import { app } from './index';

const serverlessHandler = serverless(app);

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;
  return await serverlessHandler(event, context) as APIGatewayProxyResult;
};
```

This document serves as the foundation for maintaining code quality and consistency across the LTI backend application. All team members should follow these practices to ensure a maintainable, scalable, and testable codebase.
