# Constants: Immutable Constraints

## GitHub Actions Domain Model (Fixed)

These are the "Known Knowns" - facts that constrain our naming:

### 1. GitHub Actions Terminology (Official)

| Term | Definition |
|------|-----------|
| **Workflow** | An automated process defined in `.github/workflows/*.yml` |
| **Job** | A set of steps that execute on the same runner |
| **Step** | An individual task within a job |
| **Action** | A reusable unit of code (what we're building) |
| **Runner** | The server that executes the workflow |
| **Event** | What triggers the workflow (push, PR, etc.) |

### 2. @actions/core Capabilities (Fixed)

The `@actions/core` package provides:
- Input/output management
- Logging and annotations
- Environment variable manipulation
- Secret masking
- State persistence
- Exit code control

These are ALL **runner communication** mechanisms.

### 3. @actions/github Capabilities (Fixed)

The `@actions/github` package provides:
- `context` - Workflow execution context
- `getOctokit()` - Authenticated API client

### 4. Effect Naming Conventions (Observed)

Effect ecosystem patterns:
- Services named after the **capability** not the wrapper
- `@effect/platform-node` → Node.js platform capabilities
- `@effect/sql-pg` → PostgreSQL database access
- Use nouns for services, verbs for functions

### 5. Package Naming Constraints

The package is `@effect-native/github-action-scratchpad`.

The word "action" is already in the package name, so modules like `ActionRunner` would be redundant.

## Constraints Summary

1. Use official GitHub Actions terminology
2. Don't duplicate "action" in module names
3. Names should describe capability, not just wrap a library
4. Keep it simple - this is a prototype
