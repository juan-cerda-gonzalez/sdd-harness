---
description: Vue frontend development standards for new and existing applications, including project initialization, component architecture, routing, state management, API integration, testing, accessibility, and UI conventions.
globs: ["frontend/src/**/*.{js,ts,vue}", "frontend/**/*.{json,js,ts}", "frontend/package.json"]
alwaysApply: true
---

# Frontend Project Configuration and Best Practices

## Table of Contents

- [Overview](#overview)
- [Project Initialization Strategy](#project-initialization-strategy)
  - [Existing Frontend](#existing-frontend)
  - [New Frontend](#new-frontend)
- [Technology Stack](#technology-stack)
  - [Core Technologies](#core-technologies)
  - [UI Framework](#ui-framework)
  - [Optional Feature Libraries](#optional-feature-libraries)
  - [State Management & Data Flow](#state-management--data-flow)
  - [Testing Framework](#testing-framework)
  - [Development Tools](#development-tools)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
  - [Naming Conventions](#naming-conventions)
  - [Component Conventions](#component-conventions)
  - [State Management](#state-management)
  - [Service Layer Architecture](#service-layer-architecture)
- [UI/UX Standards](#uiux-standards)
  - [Bootstrap Integration](#bootstrap-integration)
  - [Form Handling](#form-handling)
  - [Navigation Patterns](#navigation-patterns)
  - [Accessibility](#accessibility)
- [Testing Standards](#testing-standards)
  - [End-to-End Testing with Cypress](#end-to-end-testing-with-cypress)
  - [Test Organization](#test-organization)
- [Configuration Standards](#configuration-standards)
  - [TypeScript Configuration](#typescript-configuration)
  - [ESLint Configuration](#eslint-configuration)
  - [Environment Configuration](#environment-configuration)
- [Performance Best Practices](#performance-best-practices)
  - [Component Optimization](#component-optimization)
  - [Bundle Optimization](#bundle-optimization)
  - [API Efficiency](#api-efficiency)
- [Development Workflow](#development-workflow)
  - [Git Workflow](#git-workflow)
  - [Development Scripts](#development-scripts)
  - [Code Quality](#code-quality)
- [Migration Strategy](#migration-strategy)
  - [TypeScript Migration](#typescript-migration)
  - [Component Modernization](#component-modernization)

---

## Overview

This document defines the standards for Vue frontend development.

It applies to both:

- existing Vue applications that must be extended without unnecessary architectural changes;
- new Vue applications that must be initialized from scratch when required by an approved OpenSpec change.

For existing applications, preserve established project conventions unless the approved change explicitly requires a migration.

For new applications, use the baseline architecture and tooling defined by this standard.

## Project Initialization Strategy

Before implementing a frontend change, determine whether a frontend application already exists.

### Existing Frontend

When an existing frontend is present:

- Inspect the current project structure, package manager, dependencies, routing, styling, state management, API layer, testing, and build configuration.
- Preserve established conventions unless the approved OpenSpec change requires otherwise.
- Do not replace the existing build tool, router, UI framework, HTTP client, test runner, or state-management solution solely to match this standard.
- Reuse existing components, composables, utilities, services, and design patterns where appropriate.
- Introduce new dependencies only when justified by the approved change.

### New Frontend

When no frontend application exists and the approved OpenSpec change requires one:

- Initialize a Vue application using the baseline stack defined by this standard.
- Use TypeScript for all application code.
- Create the baseline project structure before implementing feature-specific code.
- Configure routing, API integration, environment handling, linting, unit/component tests, and E2E testing when required by the approved change.
- Ensure the initial project builds successfully before feature implementation is considered complete.

## Technology Stack

The versions below define the validated baseline for new Vue applications.

- New applications should use this baseline unless the project template is intentionally upgraded.
- Existing applications must preserve their currently configured stack and versions unless an approved OpenSpec change explicitly requires a migration.
- When baseline versions are updated, this document and the executable frontend scaffold/package configuration must be updated together.

### Core Technologies
- **Vue 3.4**: Modern Vue with the Composition API and `<script setup>`
- **TypeScript 5.x**: For type safety and better development experience
- **Vite 5.x**: Build tooling and development server
- **Vue Router 4.x**: Client-side routing and navigation

### UI Framework

Baseline for new applications:

- **Bootstrap 5.3.3**: Responsive styling baseline.
- **BootstrapVueNext**: Vue component integration for Bootstrap.
- **Bootstrap Icons**: Default icon library.

Existing applications must use their currently configured UI framework unless migration is explicitly required.

### Optional Feature Libraries

Feature-specific libraries must only be added when required by the approved OpenSpec change.

Examples include:

- date picker libraries;
- drag-and-drop libraries;
- charting libraries;
- rich text editors;
- specialized input components.

Do not include feature-specific dependencies in a new application unless they are actually required.

### State Management & Data Flow
- **Composition API**: `ref`, `reactive`, `computed` for local state management
- **Pinia**: Centralized store for shared/cross-component state
- **VueUse `useSortable`** (or equivalent): Drag and drop functionality
- **Axios**: HTTP client for API communication

### Testing Framework
- **Cypress 14.4.1**: End-to-end testing
- **Vitest**: Unit testing (via Vite)
- **Vue Test Utils**: Component testing utilities

### Development Tools
- **ESLint**: Code linting with Vue-specific rules
- **TypeScript**: Static type checking (`vue-tsc` for `.vue` files)
- **Vite Plugin Vue DevTools** (optional): Development-time inspection

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components (.vue)
│   ├── composables/     # Reusable stateful logic (useX.ts)
│   ├── stores/          # Pinia stores
│   ├── services/        # API service layer
│   ├── views/           # Route-level components (pages)
│   ├── router/          # Vue Router configuration
│   ├── assets/          # Images, fonts, static resources
│   ├── App.vue          # Root application component
│   ├── main.ts          # Application entry point
│   └── style.css        # Global styles
├── cypress/
│   └── e2e/             # End-to-end test files
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── cypress.config.ts    # Cypress configuration
```

## Coding Standards

### Naming Conventions

- **Component Naming**: Use PascalCase for Vue single-file components (e.g., `CandidateCard.vue`, `PositionDetails.vue`, `RecruiterDashboard.vue`)
- **Variable Naming**: Use camelCase for variables and functions (e.g., `candidateId`, `handleSubmit`, `fetchPositions`)
- **Constants Naming**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_CANDIDATES_PER_PAGE`, `API_BASE_URL`)
- **Type/Interface Naming**: Use PascalCase for types and interfaces (e.g., `CandidateData`, `PositionProps`, `ICandidateService`)
- **File Naming**: Use PascalCase for component files (e.g., `CandidateCard.vue`, `PositionDetails.vue`) and camelCase for utility/composable files (e.g., `candidateService.ts`, `useCandidate.ts`)
- **CSS Class Naming**: Use kebab-case for CSS classes (e.g., `candidate-card`, `position-details`)
- **Composable Naming**: Use camelCase starting with "use" prefix (e.g., `useCandidate`, `usePositionData`, `useFormValidation`)

**Examples:**

```vue
<!-- Good: All in English -->
<script setup lang="ts">
import { ref } from 'vue';
import type { Candidate } from '@/types/candidate';

const props = defineProps<{
    candidate: Candidate;
    index: number;
}>();

const emit = defineEmits<{
    click: [candidate: Candidate];
}>();

const isLoading = ref(false);

// Handle candidate card click event
function handleCardClick() {
    emit('click', props.candidate);
}
</script>

<template>
    <div class="candidate-card" @click="handleCardClick">
        <!-- Component template -->
    </div>
</template>
```

```vue
<!-- Avoid: Non-English comments or names -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    candidato: Candidato;
    indice: number;
}>();

const emit = defineEmits<{
    clic: [candidato: Candidato];
}>();

const estaCargando = ref(false);

// Manejar evento de clic en la tarjeta de candidato
function manejarClicTarjeta() {
    emit('clic', props.candidato);
}
</script>

<template>
    <div class="tarjeta-candidato" @click="manejarClicTarjeta">
        <!-- Template del componente -->
    </div>
</template>
```

**Error Messages and Console Logs:**

```typescript
// Good: English error messages
try {
    // ...
} catch (error) {
    console.error('Failed to fetch candidates:', error);
    errorMessage.value = 'Unable to load candidates. Please try again later.';
}

// Avoid: Non-English messages
try {
    // ...
} catch (error) {
    console.error('Error al obtener candidatos:', error);
    errorMessage.value = 'No se pudieron cargar los candidatos. Por favor, inténtelo de nuevo más tarde.';
}
```

**Service Layer Examples:**

```typescript
// Good: English naming in services
export const candidateService = {
    getAllCandidates: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/candidates`);
            return response.data;
        } catch (error) {
            console.error('Error fetching candidates:', error);
            throw error;
        }
    }
};

// Avoid: Non-English naming
export const servicioCandidatos = {
    obtenerTodosLosCandidatos: async () => {
        try {
            const respuesta = await axios.get(`${API_BASE_URL}/candidates`);
            return respuesta.data;
        } catch (error) {
            console.error('Error al obtener candidatos:', error);
            throw error;
        }
    }
};
```

### Component Conventions

#### Single-File Components with the Composition API
- **Always use `<script setup>`** with the Composition API instead of the Options API for new components
- Use **TypeScript for new components** when possible
- Keep **JavaScript for legacy components** until migration

```vue
<!-- Preferred - TypeScript single-file component -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

type Position = {
    id: number;
    title: string;
    status: 'Open' | 'Contratado' | 'Cerrado' | 'Borrador';
};

const positions = ref<Position[]>([]);
// Component logic
</script>

<template>
    <!-- Component template -->
</template>
```

#### Component Props
- **Define TypeScript types** for component props via `defineProps<T>()`
- Use **`withDefaults`** for default prop values
- Declare emitted events explicitly via `defineEmits<T>()`

```vue
<script setup lang="ts">
type CandidateCardProps = {
    candidate: Candidate;
    index: number;
};

const props = defineProps<CandidateCardProps>();
const emit = defineEmits<{
    click: [candidate: Candidate];
}>();
</script>
```

### State Management

#### Local State with the Composition API
- Use **`ref`/`reactive`** for component-level state
- Use **`onMounted`/`watch`/`watchEffect`** for side effects and data fetching
- **Extract composables** for reusable stateful logic

```typescript
const formData = reactive({
    title: '',
    description: '',
    status: 'Borrador'
});

function handleInputChange(event: Event) {
    const { name, value } = event.target as HTMLInputElement;
    (formData as Record<string, string>)[name] = value;
}
```

#### Loading and Error States
- **Always handle loading states** for async operations
- **Implement error handling** with user-friendly messages
- **Use BootstrapVueNext Alert/`b-alert`** components for feedback

```typescript
const loading = ref(true);
const error = ref('');
const success = ref('');

// In async function
try {
    loading.value = true;
    const data = await apiCall();
    success.value = 'Operation completed successfully';
} catch (err) {
    error.value = 'Error message: ' + (err as Error).message;
} finally {
    loading.value = false;
}
```

#### Shared State with Pinia
- Use **Pinia stores** for state shared across multiple components/views
- Keep stores **feature-scoped** (one store per domain concept, not one global store)
- Expose **actions** for mutations; avoid mutating store state directly from components

```typescript
// stores/positions.ts
import { defineStore } from 'pinia';

export const usePositionsStore = defineStore('positions', {
    state: () => ({
        positions: [] as Position[],
        loading: false,
    }),
    actions: {
        async fetchAll() {
            this.loading = true;
            try {
                this.positions = await positionService.getAllPositions();
            } finally {
                this.loading = false;
            }
        },
    },
});
```

### Service Layer Architecture

#### API Services
- **Centralize API calls** in service files
- Use **axios** for HTTP requests
- **Export service objects** with grouped methods
- **Handle errors at service level** when appropriate

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3010';

export const positionService = {
    getAllPositions: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/positions`);
            return response.data;
        } catch (error) {
            console.error('Error fetching positions:', error);
            throw error;
        }
    },

    updatePosition: async (id: number, positionData: Partial<Position>) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/positions/${id}`, positionData);
            return response.data;
        } catch (error) {
            console.error('Error updating position:', error);
            throw error;
        }
    }
};
```

## UI/UX Standards

### Bootstrap Integration
- Use **BootstrapVueNext components** instead of plain Bootstrap
- **Import Bootstrap CSS** in the main entry point (`main.ts`)
- Follow **Bootstrap responsive grid system** (`BContainer`, `BRow`, `BCol`)

```vue
<script setup lang="ts">
import { BContainer, BRow, BCol, BCard, BButton, BForm, BAlert } from 'bootstrap-vue-next';
</script>
```

### Form Handling
- Use **`v-model`-bound inputs** for form fields
- Implement **real-time validation** where appropriate
- **Disable submit buttons** during form submission
- **Clear form state** after successful submission

```vue
<template>
    <BForm @submit.prevent="handleSubmit">
        <BFormGroup class="mb-3" label="Title *">
            <BFormInput
                v-model="formData.title"
                type="text"
                name="title"
                required
            />
        </BFormGroup>
        <BButton type="submit" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save' }}
        </BButton>
    </BForm>
</template>
```

### Navigation Patterns
- Use **Vue Router** for all navigation
- **Implement breadcrumbs** with back navigation
- Use **programmatic navigation** with the `useRouter` composable

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
    <!-- Navigation example -->
    <BButton variant="link" @click="router.push('/')">
        ← Back to Dashboard
    </BButton>
</template>
```

### Accessibility
- Include **aria-label** attributes for interactive elements
- Use **semantic HTML** elements
- Ensure **keyboard navigation** support
- Provide **alternative text** for images

```vue
<template>
    <BFormInput
        type="text"
        placeholder="Search by title"
        aria-label="Search positions by title"
    />
</template>
```

## Testing Standards

### End-to-End Testing with Cypress
- **Test user workflows** rather than implementation details
- Use **data-testid** attributes for reliable element selection
- **Organize tests by feature** (candidates.cy.ts, positions.cy.ts)
- **Include API testing** alongside UI testing

```typescript
describe('Positions API - Update', () => {
    beforeEach(() => {
        cy.window().then((win) => {
            win.localStorage.clear();
        });
    });

    it('should update a position successfully', () => {
        const updateData = {
            title: 'Updated Test Position',
            status: 'Open'
        };

        cy.request({
            method: 'PUT',
            url: `${API_URL}/positions/${testPositionId}`,
            body: updateData
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.data.title).to.eq(updateData.title);
        });
    });
});
```

### Test Organization
- **Group related tests** with describe blocks
- **Use descriptive test names** that explain the expected behavior
- **Test both success and error scenarios**
- **Include edge cases** and validation testing

## Configuration Standards

### TypeScript Configuration
- Enable **strict mode** for type checking
- Use **path mapping** with "@/*" for cleaner imports
- Include **both Cypress and Node types**
- Use **`vue-tsc`** for type-checking `.vue` files (the standard TypeScript compiler cannot parse SFCs)

```json
{
    "compilerOptions": {
        "strict": true,
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        },
        "types": ["cypress", "node"]
    }
}
```

### ESLint Configuration
- Extend **`eslint-plugin-vue`** recommended configuration
- Include **Vitest rules** for testing
- **Automatic code formatting** and error detection
- **Consistent code style** across the project

### Environment Configuration
- Use **Vite environment variables** (`import.meta.env`, `.env` files with the `VITE_` prefix) for API URLs
- **Separate configurations** for development and production
- **Configure Cypress** with environment-specific settings

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173',
        env: {
            API_URL: 'http://localhost:3010'
        }
    }
});
```

## Performance Best Practices

### Component Optimization
- **Lazy load** route-level components with dynamic `import()`
- **Memoize expensive calculations** with `computed`
- **Avoid unnecessary re-renders** by keeping reactive state narrowly scoped
- **Extract reusable logic** into composables

### Bundle Optimization
- **Tree shaking** enabled through Vite
- **Code splitting** at route level (`component: () => import('...')`)
- **Optimize images** and static assets
- **Monitor bundle size** with `vite build --report` or an equivalent analyzer

### API Efficiency
- **Implement proper error handling** for network requests
- **Cache API responses** where appropriate
- **Use loading states** to improve perceived performance
- **Batch API calls** when possible

## Development Workflow

### Git Workflow

- **Feature Branches**: Develop features in separate branches, adding descriptive suffix "-frontend" to allow working in parallel and avoid conflicts or collisions
- **Descriptive Commits**: Write descriptive commit messages in English
- **Code Review**: Code review before merging
- **Small Branches**: Keep branches small and focused

### Development Scripts
```bash
npm run dev             # Development server
npm run test:unit       # Run unit tests (Vitest)
npm run build           # Production build (type-checks with vue-tsc, then builds)
npm run cypress:open    # Open Cypress test runner
npm run cypress:run     # Run Cypress tests headlessly
```

### Code Quality
- **ESLint validation** before commits
- **TypeScript compilation** (`vue-tsc --noEmit`) without errors
- **All tests passing** before deployment
- **Performance monitoring** with browser DevTools / Lighthouse

## Migration Strategy

### TypeScript Migration
- **Gradual migration** from JavaScript to TypeScript
- **New components in TypeScript** by default
- **Maintain existing JavaScript** components until planned refactor
- **Add types incrementally** to existing code

### Component Modernization
- **Composition API with `<script setup>`** over the Options API
- **Composables** instead of mixins
- **BootstrapVueNext** components for consistency
- **Responsive design** principles throughout

This document serves as the foundation for maintaining code quality and consistency across the frontend application. All team members should follow these practices to ensure a maintainable and scalable codebase.
