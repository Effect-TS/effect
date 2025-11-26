# @effect-native/platform-github Implementation Plan

## Overview

Implementation follows Red-Green-Refactor TDD with phased delivery.

---

## Phase A: Project Setup

### A1. Initialize package structure
- Create packages-native/platform-github/ directory
- Create package.json with dependencies
- Create tsconfig.json extending base
- Create vitest.config.ts
- **Verify**: pnpm install succeeds, tsc --noEmit passes

### A2. Create module skeleton
- Create src/index.ts (empty exports)
- Create src/ActionError.ts (empty)
- Create src/ActionRunner.ts (empty)
- Create src/ActionContext.ts (empty)
- Create src/ActionClient.ts (empty)
- Create src/ActionSummary.ts (empty)
- Create src/Action.ts (empty)
- Create src/internal/ directory with corresponding files
- **Verify**: tsc --noEmit passes, package builds

---

## Phase B: Error Types

### B1. ActionInputError (RED)
- Write test/ActionError.test.ts with tests for ActionInputError construction and message
- Create minimal stub that fails tests
- **Verify**: Tests fail with expected assertions

### B2. ActionInputError (GREEN)
- Implement ActionInputError using Schema.TaggedError
- Add reason, name, value fields
- Add message getter
- **Verify**: All ActionInputError tests pass

### B3. ActionContextError (RED → GREEN)
- Add tests for ActionContextError
- Implement ActionContextError
- **Verify**: All ActionContextError tests pass

### B4. ActionApiError (RED → GREEN)
- Add tests for ActionApiError including isRateLimited
- Implement ActionApiError
- **Verify**: All ActionApiError tests pass

### B5. ActionOIDCError (RED → GREEN)
- Add tests for ActionOIDCError
- Implement ActionOIDCError
- **Verify**: All ActionOIDCError tests pass

### B6. ActionSummaryError (RED → GREEN)
- Add tests for ActionSummaryError
- Implement ActionSummaryError
- **Verify**: All error tests pass

---

## Phase C: ActionRunner Service

### C1. TypeId and Tag setup
- Define TypeId symbol in internal/actionRunner.ts
- Define ActionRunner interface in ActionRunner.ts
- Export Context.GenericTag
- **Verify**: tsc --noEmit passes

### C2. Input methods (RED)
- Write test/ActionRunner.test.ts
- Test getInput with mock layer
- Test getMultilineInput
- Test getBooleanInput including error case
- Create stub layer that fails tests
- **Verify**: Tests fail

### C3. Input methods (GREEN)
- Implement getInput wrapping @actions/core
- Implement getMultilineInput
- Implement getBooleanInput with error conversion
- Create ActionRunner.layer
- **Verify**: Input tests pass

### C4. Output and logging methods (RED → GREEN)
- Add tests for setOutput, debug, info, warning, error, notice
- Implement all logging methods
- **Verify**: Output and logging tests pass

### C5. Group methods (RED → GREEN)
- Add tests for startGroup, endGroup, group
- Test that group calls endGroup on error
- Implement using Effect.acquireUseRelease
- **Verify**: Group tests pass

### C6. Environment methods (RED → GREEN)
- Add tests for exportVariable, addPath, setSecret
- Implement all environment methods
- **Verify**: Environment tests pass

### C7. State methods (RED → GREEN)
- Add tests for saveState, getState
- Implement state methods
- **Verify**: State tests pass

### C8. Result and OIDC methods (RED → GREEN)
- Add tests for setFailed
- Add tests for getIDToken including error cases
- Implement setFailed
- Implement getIDToken with Effect.tryPromise
- **Verify**: All ActionRunner tests pass

### C9. Accessor functions
- Export accessor functions for each method
- Add tests verifying accessor usage
- **Verify**: All accessor tests pass

---

## Phase D: ActionContext Service

### D1. TypeId and Tag setup
- Define TypeId symbol in internal/actionContext.ts
- Define ActionContext interface in ActionContext.ts
- Export Context.GenericTag
- **Verify**: tsc --noEmit passes

### D2. Basic properties (RED)
- Write test/ActionContext.test.ts
- Test eventName, sha, ref, workflow, action, actor, job
- Test runAttempt, runNumber, runId
- Create stub layer that fails
- **Verify**: Tests fail

### D3. Basic properties (GREEN)
- Implement context data retrieval from environment
- Create ActionContext.layer
- **Verify**: Basic property tests pass

### D4. URL properties (RED → GREEN)
- Add tests for apiUrl, serverUrl, graphqlUrl with defaults
- Implement URL properties
- **Verify**: URL tests pass

### D5. Payload property (RED → GREEN)
- Add tests for payload loading from GITHUB_EVENT_PATH
- Test error case for invalid JSON
- Implement payload loading
- **Verify**: Payload tests pass

### D6. Computed properties (RED → GREEN)
- Add tests for repo property
- Add tests for issue property
- Test error cases
- Implement repo and issue computations
- **Verify**: All ActionContext tests pass

### D7. Accessor functions
- Export accessor functions for each property
- **Verify**: Accessor tests pass

---

## Phase E: ActionClient Service

### E1. TypeId and Tag setup
- Define TypeId and interface for ActionClient
- Export Context.GenericTag
- **Verify**: tsc --noEmit passes

### E2. Octokit access (RED → GREEN)
- Write test/ActionClient.test.ts
- Test octokit property returns configured client
- Implement ActionClient.layer(token)
- **Verify**: Octokit tests pass

### E3. Request helper (RED → GREEN)
- Add tests for request helper
- Test error conversion to ActionApiError
- Implement request with Effect.tryPromise
- **Verify**: Request tests pass

### E4. GraphQL helper (RED → GREEN)
- Add tests for graphql helper
- Implement graphql method
- **Verify**: GraphQL tests pass

### E5. Paginate helper (RED → GREEN)
- Add tests for paginate helper
- Implement pagination collection
- **Verify**: All ActionClient tests pass

### E6. Accessor functions
- Export accessor functions
- **Verify**: Accessor tests pass

---

## Phase F: ActionSummary Service

### F1. TypeId and Tag setup
- Define TypeId and interface for ActionSummary
- Export Context.GenericTag
- **Verify**: tsc --noEmit passes

### F2. Content methods (RED → GREEN)
- Write test/ActionSummary.test.ts
- Test addRaw, addCodeBlock, addList, addTable
- Test addHeading, addDetails, addImage
- Implement all content methods
- **Verify**: Content tests pass

### F3. Buffer methods (RED → GREEN)
- Test stringify, isEmptyBuffer, emptyBuffer
- Implement buffer methods
- **Verify**: Buffer tests pass

### F4. File operations (RED → GREEN)
- Test write with mock file system
- Test clear
- Test error cases
- Implement file operations with Effect.tryPromise
- **Verify**: All ActionSummary tests pass

---

## Phase G: Combined Layer and Exports

### G1. Action module
- Implement Action.layer(token) combining all services
- Export convenience types
- **Verify**: tsc --noEmit passes

### G2. Index exports
- Export all public modules from index.ts
- Add JSDoc with @since tags
- **Verify**: Package exports correctly

### G3. Test layers
- Implement ActionRunner.layerTest
- Implement ActionContext.layerTest
- Implement ActionClient.layerTest
- Implement ActionSummary.layerTest
- **Verify**: Test layers work in tests

---

## Phase H: Documentation and Polish

### H1. JSDoc completion
- Ensure all exports have @since 1.0.0
- Ensure all exports have @category tags
- Add descriptions to all interfaces and methods
- **Verify**: Documentation complete

### H2. README
- Write package README.md
- Include getting started example
- Document all services
- **Verify**: README is helpful

### H3. Final validation
- Run full test suite
- Run type check
- Build package
- **Verify**: Package ready for release

---

## Verification Commands

At each verify step, run the appropriate commands:

- **tsc --noEmit passes**: `pnpm --filter @effect-native/platform-github exec tsc --noEmit`
- **Tests pass**: `pnpm --filter @effect-native/platform-github test`
- **Tests fail**: `pnpm --filter @effect-native/platform-github test` (expect failures)
- **Package builds**: `pnpm --filter @effect-native/platform-github build`

---

## Implementation Notes

### RED Phase
- Write test first with clear expectations
- Create minimal stub (interface + layer returning Effect.die or Effect.succeed with wrong value)
- Verify tests fail for the right reason

### GREEN Phase
- Implement just enough to make tests pass
- Do not optimize or refactor yet
- Focus on correctness

### REFACTOR Phase (optional per step)
- If code is messy, clean up
- Extract helpers if duplication
- Improve naming if unclear
- Tests must still pass after refactor
