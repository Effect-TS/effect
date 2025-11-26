# Hypothesis: Module Naming

## Prior Assumptions

I expect the following naming pattern to be appropriate:

1. **"Core"** wraps `@actions/core` - the foundational I/O for GitHub Actions
2. **"GitHub"** wraps `@actions/github` - the context and Octokit client

## Reasoning for Current Names

- `Core` mirrors the npm package name `@actions/core`
- `GitHub` mirrors the npm package name `@actions/github`

## Problems I Already Suspect

- **"Core"** is extremely generic - could mean anything in any project
- **"GitHub"** is also generic - GitHub has many APIs, contexts, services
- Neither name communicates what the module actually DOES
- These names follow the upstream library names rather than describing the domain concepts

## Expected Better Pattern

Effect packages typically use names that describe:
- The **domain concept** (what it represents)
- The **capability** (what it enables)
- The **service boundary** (what responsibilities it has)

Examples from Effect ecosystem:
- `@effect/platform` → Platform-specific capabilities
- `@effect/sql` → SQL database operations
- `@effect/schema` → Data validation/transformation
- `@effect/cli` → Command-line interface utilities

## Hypothesis

The module names should describe the **GitHub Actions domain concepts** they wrap, not just mirror the upstream package names.
