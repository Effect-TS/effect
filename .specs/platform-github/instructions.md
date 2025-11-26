# @effect-native/platform-github Instructions

## Context

GitHub Actions is GitHub's CI/CD platform that allows developers to automate workflows directly in their repositories. The official `@actions/toolkit` provides JavaScript/TypeScript libraries for building actions:

- `@actions/core` - Core functions for inputs, outputs, logging, annotations, environment, and state
- `@actions/github` - GitHub API client and workflow context

Currently, developers using Effect-TS for their GitHub Actions must manually wrap these libraries, leading to:
- Inconsistent error handling patterns
- Boilerplate for Effect integration
- No type-safe access to context properties
- Manual management of async operations

The effect-native ecosystem already provides platform packages for Node.js, Bun, and browsers. Adding a GitHub Actions platform package would complete the story for CI/CD workflows.

## User Story

**As a** developer building GitHub Actions with Effect-TS,
**I want** type-safe, Effect-native wrappers for the @actions/toolkit,
**So that** I can build composable, testable actions with proper error handling without writing boilerplate.

## High-Level Goals

1. **Provide Effect-native services** for all @actions/core functionality
   - Type-safe inputs with validation errors
   - Effect-based logging and annotations
   - State and environment management
   - Job summary builder

2. **Provide Effect-native access to workflow context**
   - Strongly-typed webhook payload access
   - Repository and issue/PR context
   - Run metadata (sha, ref, actor, etc.)

3. **Provide Effect-wrapped GitHub API client**
   - Octokit with REST endpoint methods
   - GraphQL support
   - Pagination helpers
   - Proper error types for API failures

4. **Support testability**
   - Mock layers for all services
   - Easy testing without GitHub environment
   - Integration with @effect/vitest

5. **Follow Effect platform conventions**
   - TypeId pattern for services
   - Tagged errors with actionable messages
   - Layer-based dependency injection
   - JSDoc with @since and @category tags

## Out of Scope

### For v1.0

- **CLI tooling** - No scaffolding or code generation tools
- **Pre/post action lifecycle hooks** - Focus on main action only
- **Composite actions** - Focus on JavaScript/TypeScript actions
- **Problem matchers** - Niche feature, can add later
- **Actions Cache API** - Separate package (`@actions/cache`)
- **Artifact upload/download** - Separate package (`@actions/artifact`)
- **Tool cache** - Separate package (`@actions/tool-cache`)

### Permanently Out of Scope

- **Workflow YAML generation** - Different concern
- **Action marketplace publishing** - Infrastructure, not library
- **Runner administration** - Different concern
- **Self-hosted runner support** - Works automatically via @actions/*
