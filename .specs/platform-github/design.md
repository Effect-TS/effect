# @effect-native/platform-github Design

## Package Structure

The package follows Effect platform conventions with a clear separation between public API and internal implementations.

### File Organization

- **src/ActionRunner.ts** - Runner service public module
- **src/ActionContext.ts** - Context service public module  
- **src/ActionClient.ts** - Client service public module
- **src/ActionSummary.ts** - Summary service public module
- **src/ActionError.ts** - Shared error types
- **src/Action.ts** - Combined layer and re-exports
- **src/index.ts** - Package entry point
- **src/internal/actionRunner.ts** - Runner implementation
- **src/internal/actionContext.ts** - Context implementation
- **src/internal/actionClient.ts** - Client implementation
- **src/internal/actionSummary.ts** - Summary implementation

---

## Data Models

### Input Options

- **InputOptions** - Configuration for input retrieval
  - required: optional boolean, defaults to false
  - trimWhitespace: optional boolean, defaults to true

### Annotation Properties

- **AnnotationProperties** - Metadata for annotations (warnings, errors, notices)
  - title: optional string
  - file: optional string (file path)
  - startLine: optional positive integer
  - endLine: optional positive integer
  - startColumn: optional positive integer
  - endColumn: optional positive integer

### Webhook Payload

- **WebhookPayload** - GitHub webhook event payload
  - Extends Record with string keys to any values
  - Known properties: repository, issue, pull_request, sender, action, installation, comment

### Repository Reference

- **RepoRef** - Repository owner and name
  - owner: string
  - repo: string

### Issue Reference

- **IssueRef** - Repository with issue/PR number
  - owner: string
  - repo: string
  - number: positive integer

### Summary Table Types

- **SummaryTableCell** - Individual table cell
  - data: string (cell content)
  - header: optional boolean (render as th)
  - colspan: optional string (column span)
  - rowspan: optional string (row span)

- **SummaryTableRow** - Array of cells or strings

### Summary Image Options

- **SummaryImageOptions** - Image sizing
  - width: optional string (pixels)
  - height: optional string (pixels)

### Summary Write Options

- **SummaryWriteOptions** - Write behavior
  - overwrite: optional boolean (default false = append)

---

## Service Interfaces

### ActionRunner

The ActionRunner service provides all runner communication functionality.

**Tag Identifier**: "@effect-native/platform-github/ActionRunner"

**Methods**:

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| getInput | name, options? | Effect of string or ActionInputError | Get input value |
| getMultilineInput | name, options? | Effect of string array or ActionInputError | Get multiline input |
| getBooleanInput | name, options? | Effect of boolean or ActionInputError | Get boolean input |
| setOutput | name, value | Effect of void | Set output value |
| debug | message | Effect of void | Write debug log |
| info | message | Effect of void | Write info log |
| warning | message, properties? | Effect of void | Create warning annotation |
| error | message, properties? | Effect of void | Create error annotation |
| notice | message, properties? | Effect of void | Create notice annotation |
| isDebug | - | Effect of boolean | Check if debug mode |
| startGroup | name | Effect of void | Begin log group |
| endGroup | - | Effect of void | End log group |
| group | name, effect | Effect of A, E, R | Run effect in group |
| exportVariable | name, value | Effect of void | Set environment variable |
| addPath | inputPath | Effect of void | Add to PATH |
| setSecret | secret | Effect of void | Mask value in logs |
| saveState | name, value | Effect of void | Save action state |
| getState | name | Effect of string | Get action state |
| setFailed | message | Effect of void | Fail the action |
| getIDToken | audience? | Effect of string or ActionOIDCError | Get OIDC token |

### ActionContext

The ActionContext service provides typed access to workflow execution context.

**Tag Identifier**: "@effect-native/platform-github/ActionContext"

**Properties** (all return Effect):

| Property | Return Type | Source |
|----------|-------------|--------|
| payload | Effect of WebhookPayload | GITHUB_EVENT_PATH file |
| eventName | Effect of string | GITHUB_EVENT_NAME |
| sha | Effect of string | GITHUB_SHA |
| ref | Effect of string | GITHUB_REF |
| workflow | Effect of string | GITHUB_WORKFLOW |
| action | Effect of string | GITHUB_ACTION |
| actor | Effect of string | GITHUB_ACTOR |
| job | Effect of string | GITHUB_JOB |
| runAttempt | Effect of number | GITHUB_RUN_ATTEMPT |
| runNumber | Effect of number | GITHUB_RUN_NUMBER |
| runId | Effect of number | GITHUB_RUN_ID |
| apiUrl | Effect of string | GITHUB_API_URL or default |
| serverUrl | Effect of string | GITHUB_SERVER_URL or default |
| graphqlUrl | Effect of string | GITHUB_GRAPHQL_URL or default |
| repo | Effect of RepoRef or ActionContextError | Computed |
| issue | Effect of IssueRef or ActionContextError | Computed |

### ActionClient

The ActionClient service provides Effect-wrapped GitHub API access.

**Tag Identifier**: "@effect-native/platform-github/ActionClient"

**Methods**:

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| octokit | - | Effect of Octokit | Get raw Octokit instance |
| request | fn returning Promise | Effect of T or ActionApiError | Execute API request |
| graphql | query, variables? | Effect of T or ActionApiError | Execute GraphQL query |
| paginate | fn returning AsyncIterator | Effect of T[] or ActionApiError | Collect paginated results |

### ActionSummary

The ActionSummary service provides a chainable job summary builder.

**Tag Identifier**: "@effect-native/platform-github/ActionSummary"

**Chainable Methods** (all return ActionSummary):

| Method | Parameters | Description |
|--------|------------|-------------|
| addRaw | text, addEOL? | Add raw text |
| addEOL | - | Add newline |
| addCodeBlock | code, lang? | Add code block |
| addList | items, ordered? | Add list |
| addTable | rows | Add table |
| addDetails | label, content | Add collapsible details |
| addImage | src, alt, options? | Add image |
| addHeading | text, level? | Add heading (h1-h6) |
| addSeparator | - | Add horizontal rule |
| addBreak | - | Add line break |
| addQuote | text, cite? | Add blockquote |
| addLink | text, href | Add link |
| emptyBuffer | - | Clear buffer |

**Query Methods**:

| Method | Return Type | Description |
|--------|-------------|-------------|
| stringify | string | Get buffer contents |
| isEmptyBuffer | boolean | Check if buffer empty |

**Effect Methods**:

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| write | options? | Effect of void or ActionSummaryError | Write to summary file |
| clear | - | Effect of void or ActionSummaryError | Clear summary file |

---

## Error Types

### ActionInputError

Represents input retrieval failures.

**Fields**:
- reason: one of "MissingRequired", "InvalidBoolean", "InvalidFormat"
- name: the input name that caused the error
- value: optional, the invalid value (for InvalidBoolean)

**Message Format**:
- MissingRequired: "Required input 'name' was not supplied"
- InvalidBoolean: "Input 'name' has invalid boolean value 'value'. Expected: true|True|TRUE|false|False|FALSE"
- InvalidFormat: "Input 'name' has invalid format"

### ActionContextError

Represents context access failures.

**Fields**:
- reason: one of "MissingRepository", "InvalidPayload"
- details: optional additional information

**Message Format**:
- MissingRepository: "Could not determine repository. Set GITHUB_REPOSITORY or ensure payload contains repository"
- InvalidPayload: "Failed to parse webhook payload: details"

### ActionApiError

Represents GitHub API failures.

**Fields**:
- status: optional HTTP status code
- message: error message
- endpoint: optional API endpoint that failed
- rateLimitReset: optional Date when rate limit resets

**Message Format**: "GitHub API error (status): message at endpoint"

**Computed Properties**:
- isRateLimited: true if status is 403 and rateLimitReset is set

### ActionOIDCError

Represents OIDC token failures.

**Fields**:
- reason: one of "MissingEnvironment", "RequestFailed", "TokenInvalid"
- details: optional additional information

**Message Format**:
- MissingEnvironment: "OIDC token request requires ACTIONS_ID_TOKEN_REQUEST_URL and ACTIONS_ID_TOKEN_REQUEST_TOKEN"
- RequestFailed: "OIDC token request failed: details"
- TokenInvalid: "OIDC token is invalid: details"

### ActionSummaryError

Represents summary file failures.

**Fields**:
- reason: one of "MissingPath", "WriteError"
- details: optional additional information

**Message Format**:
- MissingPath: "GITHUB_STEP_SUMMARY environment variable not set"
- WriteError: "Failed to write summary: details"

---

## Layer Architecture

### Individual Layers

- **ActionRunner.layer** - Provides ActionRunner using @actions/core
- **ActionContext.layer** - Provides ActionContext using @actions/github context
- **ActionClient.layer(token)** - Provides ActionClient configured with token
- **ActionSummary.layer** - Provides ActionSummary using @actions/core summary

### Combined Layer

- **Action.layer(token)** - Provides all four services

The combined layer composes individual layers:
1. ActionRunner.layer (no dependencies)
2. ActionContext.layer (no dependencies)
3. ActionClient.layer(token) (no dependencies)
4. ActionSummary.layer (no dependencies)

### Test Layers

- **ActionRunner.layerTest(inputs?)** - Mock runner with optional input map
- **ActionContext.layerTest(data)** - Mock context with provided data
- **ActionClient.layerTest(responses?)** - Mock client with optional response map
- **ActionSummary.layerTest** - Mock summary that captures buffer

---

## Module Dependencies

### External Dependencies

- @actions/core - Runner communication primitives
- @actions/github - Context and Octokit factory
- effect - Core Effect types and utilities
- @effect/schema - Error type definitions

### Internal Dependencies

- ActionRunner depends on: @actions/core
- ActionContext depends on: @actions/github (Context class)
- ActionClient depends on: @actions/github (getOctokit function)
- ActionSummary depends on: @actions/core (summary singleton)
- ActionError depends on: @effect/schema

---

## Implementation Patterns

### Effect Wrapping

Synchronous @actions/core functions are wrapped with Effect.sync:
- getInput, setOutput, debug, info, etc.

Async @actions/core functions are wrapped with Effect.tryPromise:
- getIDToken
- summary.write, summary.clear

Error-prone functions are wrapped with Effect.try:
- getBooleanInput (can throw on invalid format)
- getInput with required: true (can throw if missing)

### Service Construction

Each service follows the pattern:
1. Define TypeId symbol in internal module
2. Define interface with TypeId field in public module
3. Export Context.GenericTag in public module
4. Implement make function in internal module
5. Export layer in public module

### Accessor Functions

Each service method has a corresponding top-level accessor:
- Accessor calls Effect.flatMap(Tag, service => service.method(...))
- This enables both styles: Tag.method() or Effect.flatMap(Tag, s => s.method())

---

## Testing Approach

### Unit Tests

Each service has a test file that:
1. Uses mock layers (no real GitHub environment)
2. Tests success cases for all methods
3. Tests error cases (invalid input, missing env vars)
4. Uses @effect/vitest for Effect-aware testing

### Integration Tests

Run in GitHub Actions CI:
1. Use real environment variables
2. Test against actual runner
3. Verify outputs, logs, and summary appear correctly

### Test Utilities

The package exports test helpers:
- mockInputs: Set up INPUT_* environment variables
- mockState: Set up STATE_* environment variables
- mockPayload: Write mock event payload to temp file
- captureOutputs: Capture setOutput calls for verification
