# @effect-native/platform-github Design

## Architecture Overview

The package provides three main capabilities:

1. **Runtime**: `Action.runMain` for running Effects as GitHub Actions with proper error handling
2. **Platform Layer**: Implementations of `@effect/platform` services for GitHub Actions runtime
3. **Input/Output**: Schema-based input parsing and output setting

### Core Design Principle: No Magic Strings

**Programs must never need to know environment variable names.**

All GitHub Actions environment data is exposed through:
- Typed services (ActionContext, ActionRunner, etc.)
- Schema-validated inputs via `Input.parse`
- Typed outputs via `Output.set`

There is no legitimate reason for a program to access `process.env.GITHUB_*` directly. The platform layer handles all environment interaction internally.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        User's Action Code                                │
│  Effect.gen(function* () {                                              │
│    const token = yield* Input.parse("token", Schema.Redacted(...))      │
│    const ctx = yield* ActionContext                                     │
│    // ... action logic                                                  │
│    yield* Output.set("result", "success")                               │
│  })                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Action.layer                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ActionContext │ │ ActionRunner │ │ActionSummary │ │ ActionClient │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Runtime                                │
│  @actions/core │ @actions/github │ Node.js APIs │ Environment Variables │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Error Model

### Failure vs Error

| Term | Meaning | Example |
|------|---------|---------|
| **Failure** | Action correctly decided to stop | Invalid input, missing required value, precondition not met |
| **Error** | Something unexpected broke | Network error, API error, bug |

### Failure Types

```typescript
// Input validation failed
export class InputValidationFailure extends Data.TaggedError("InputValidationFailure")<{
  readonly input: string           // Input name
  readonly reason: "MissingRequired" | "InvalidType" | "InvalidJson" | "SchemaValidation"
  readonly value: string           // The raw value that failed
  readonly message: string         // Human-readable message
  readonly cause?: unknown         // Underlying error (e.g., ParseError)
}> {}

// User explicitly fails the action
export class ActionFailed extends Data.TaggedError("ActionFailed")<{
  readonly message: string
  readonly cause?: unknown
}> {}
```

### Error Handling in runMain

`Action.runMain` accepts `Effect<A, E, ActionRequirements>` with **any error type E** (like NodeRuntime.runMain).

On failure:
1. Logs error via Effect's logger (pretty printed)
2. Formats message nicely for known failure types
3. Calls `core.setFailed(message)` for GitHub UI annotation
4. Sets exit code 1

Users don't need to handle errors explicitly - they flow through naturally. But they can recover if desired.

---

## Action.runMain

The primary entry point for running an Effect as a GitHub Action.

**Signature**:
```typescript
runMain: <E, A>(
  effect: Effect<A, E, ActionRequirements>,
  options?: RunMainOptions
) => void
```

**RunMainOptions**:
- `disableErrorReporting`: boolean (default false) - Turn off automatic error logging
- `disablePrettyLogger`: boolean (default false) - Use default logger instead of pretty

**Behavior**:
1. Provides `Action.layer` automatically (ActionRunner, ActionContext, ActionClient, ActionSummary)
2. Runs the Effect with fiber-based execution
3. Logs errors via Effect's logging system
4. On failure: calls `core.setFailed(message)`, exits with code 1
5. On success: exits with code 0
6. On interrupt (SIGINT/SIGTERM): interrupts fiber, exits gracefully

**Example - errors flow naturally**:
```typescript
import { Action, Input, ActionRunner } from "@effect-native/platform-github"
import { Effect, Schema } from "effect"

const program = Effect.gen(function* () {
  // If invalid, InputValidationFailure propagates to runMain
  const count = yield* Input.parse("count", Schema.NumberFromString)
  
  const runner = yield* ActionRunner
  yield* runner.info(`Count: ${count}`)
})

// Errors handled automatically by runMain
Action.runMain(program)
```

**Example - explicit recovery**:
```typescript
const program = Effect.gen(function* () {
  const count = yield* Input.parse("count", Schema.NumberFromString).pipe(
    Effect.orElseSucceed(() => 10)  // Default on error
  )
})
```

**Example - explicit failure**:
```typescript
const program = Effect.gen(function* () {
  const pr = yield* getPullRequest()
  if (pr.draft) {
    yield* Effect.fail(new ActionFailed({ 
      message: "Cannot merge draft PRs" 
    }))
  }
})
```

---

## Input System

### Design Philosophy

**Schema-first, minimal API.**

The input system is built on Effect Schema. There's no custom AST or DSL - just two functions that leverage Schema's full power.

### Core API

```typescript
// Get raw string value (never fails, returns "" if missing)
Input.raw(name: string): Effect<string, never, ActionRunner>

// Parse with any Schema (fails with InputValidationFailure if missing or invalid)
Input.parse<A, I, R>(
  name: string, 
  schema: Schema<A, I, R>
): Effect<A, InputValidationFailure, ActionRunner | R>
```

### Usage Examples

```typescript
import { Input } from "@effect-native/platform-github"
import { Effect, Schema } from "effect"

// Required string
const title = yield* Input.parse("title", Schema.NonEmptyString)

// Optional string (use Effect.option)
const body = yield* Input.parse("body", Schema.String).pipe(Effect.option)

// Integer with default (use Effect.orElseSucceed)
const count = yield* Input.parse("count", Schema.NumberFromString.pipe(Schema.int())).pipe(
  Effect.orElseSucceed(() => 10)
)

// Secret (use Schema.Redacted)
const token = yield* Input.parse("token", Schema.Redacted(Schema.NonEmptyString))

// Boolean - YAML 1.2 style (use Input.YamlBoolean schema)
const dryRun = yield* Input.parse("dry-run", Input.YamlBoolean)

// Complex JSON config
const MyConfig = Schema.Struct({
  retries: Schema.Number,
  timeout: Schema.Number
})
const config = yield* Input.parse("config", Schema.parseJson(MyConfig))

// Compose multiple inputs with Effect.all
const inputs = yield* Effect.all({
  title: Input.parse("title", Schema.NonEmptyString),
  count: Input.parse("count", Schema.NumberFromString).pipe(Effect.orElseSucceed(() => 10)),
  token: Input.parse("token", Schema.Redacted(Schema.NonEmptyString))
})
// Type: { title: string, count: number, token: Redacted<string> }
```

### Built-in Schemas

```typescript
// YAML 1.2 boolean (true/false/yes/no/on/off/1/0)
Input.YamlBoolean: Schema<boolean, string>
```

### Convenience Helpers (Optional Sugar)

These are shortcuts for common patterns:

```typescript
Input.string(name) = Input.parse(name, Schema.String)
Input.nonEmptyString(name) = Input.parse(name, Schema.NonEmptyString)
Input.integer(name) = Input.parse(name, Schema.NumberFromString.pipe(Schema.int()))
Input.number(name) = Input.parse(name, Schema.NumberFromString)
Input.boolean(name) = Input.parse(name, Input.YamlBoolean)
Input.secret(name) = Input.parse(name, Schema.Redacted(Schema.NonEmptyString))
Input.json(name, schema) = Input.parse(name, Schema.parseJson(schema))
```

### Error Messages

Validation errors include the input name and are formatted clearly:

```
Input 'count' is invalid: expected integer, got "abc"
Input 'token' is invalid: required input was not provided
Input 'config' is invalid: JSON parse error at position 15
Input 'config' is invalid: expected number at path "retries", got string
```

---

## Output System

### Core API

```typescript
// Set raw string output
Output.set(name: string, value: string): Effect<void, never, ActionRunner>

// Set with Schema encoding (for type safety)
Output.encode<A, I>(
  name: string, 
  schema: Schema<A, I>,
  value: A
): Effect<void, never, ActionRunner>
```

### Usage Examples

```typescript
import { Output } from "@effect-native/platform-github"
import { Effect, Schema } from "effect"

// Simple string output
yield* Output.set("result", "success")

// Number (converted to string)
yield* Output.set("count", String(42))

// JSON output
yield* Output.set("data", JSON.stringify({ foo: "bar" }))

// With Schema encoding
yield* Output.encode("count", Schema.NumberFromString, 42)
```

### Convenience Helpers

```typescript
Output.text(name, value: string) = Output.set(name, value)
Output.integer(name, value: number) = Output.set(name, String(value))
Output.boolean(name, value: boolean) = Output.set(name, String(value))
Output.json(name, value: unknown) = Output.set(name, JSON.stringify(value))
```

---

## Services

### ActionRunner

**Tag**: `@effect-native/platform-github/ActionRunner`

Low-level runner communication:

| Method | Purpose |
|--------|---------|
| `getInput(name, options?)` | Get input value (returns "" if missing) |
| `getBooleanInput(name)` | Get boolean input |
| `getMultilineInput(name)` | Get multiline input as array |
| `setOutput(name, value)` | Set output value |
| `debug(message)` | Write debug message |
| `info(message)` | Write info message |
| `warning(message, props?)` | Create warning annotation |
| `error(message, props?)` | Create error annotation |
| `notice(message, props?)` | Create notice annotation |
| `startGroup(name)` | Begin log group |
| `endGroup()` | End log group |
| `group(name, effect)` | Run effect in group |
| `exportVariable(name, value)` | Set environment variable |
| `addPath(path)` | Add to PATH |
| `setSecret(secret)` | Mask value in logs |
| `saveState(name, value)` | Save state for post action |
| `getState(name)` | Get saved state |
| `setFailed(message)` | Fail the action |
| `getIDToken(audience?)` | Get OIDC token |

### ActionContext

**Tag**: `@effect-native/platform-github/ActionContext`

Typed access to workflow context:

| Property | Type | Description |
|----------|------|-------------|
| `eventName` | string | Event that triggered workflow |
| `payload` | WebhookPayload | Full webhook payload |
| `sha` | string | Commit SHA |
| `ref` | string | Git ref |
| `workflow` | string | Workflow name |
| `action` | string | Action/step identifier |
| `actor` | string | Triggering user |
| `job` | string | Job identifier |
| `runId` | number | Unique run ID |
| `runNumber` | number | Run number |
| `runAttempt` | number | Attempt number |
| `apiUrl` | string | API base URL |
| `serverUrl` | string | Server base URL |
| `graphqlUrl` | string | GraphQL endpoint |
| `repo` | { owner, name } | Repository info |
| `issue` | Option<{ owner, repo, number }> | Issue/PR info |

### ActionClient

**Tag**: `@effect-native/platform-github/ActionClient`

GitHub API client:

| Method | Purpose |
|--------|---------|
| `octokit` | Get configured Octokit instance |
| `request(fn)` | Effect-wrapped API request |
| `graphql(query, vars?)` | Effect-wrapped GraphQL |
| `paginate(fn)` | Collect paginated results |

### ActionSummary

**Tag**: `@effect-native/platform-github/ActionSummary`

Job summary builder (chainable):

| Method | HTML Output |
|--------|-------------|
| `addRaw(text, addEOL?)` | Raw text |
| `addHeading(text, level?)` | `<h1>`-`<h6>` |
| `addCodeBlock(code, lang?)` | `<pre><code>` |
| `addList(items, ordered?)` | `<ul>` or `<ol>` |
| `addTable(rows)` | `<table>` |
| `addDetails(label, content)` | `<details>` |
| `addImage(src, alt, opts?)` | `<img>` |
| `addSeparator()` | `<hr>` |
| `addBreak()` | `<br>` |
| `addQuote(text, cite?)` | `<blockquote>` |
| `addLink(text, href)` | `<a>` |
| `write(options?)` | Write to file (Effect) |
| `clear()` | Clear buffer and file (Effect) |

---

## Complete Example

```typescript
import { Action, Input, Output, ActionContext, ActionRunner, ActionClient } from "@effect-native/platform-github"
import { Effect, Schema } from "effect"

const program = Effect.gen(function* () {
  // Parse inputs with Schema validation
  const token = yield* Input.parse("github-token", Schema.Redacted(Schema.NonEmptyString))
  const title = yield* Input.parse("title", Schema.NonEmptyString)
  const labels = yield* Input.parse("labels", Schema.String).pipe(
    Effect.map(s => s.split(",").map(l => l.trim()).filter(Boolean)),
    Effect.orElseSucceed(() => [])
  )
  
  // Get context
  const ctx = yield* ActionContext
  const client = yield* ActionClient
  const runner = yield* ActionRunner
  
  yield* runner.info(`Creating issue in ${ctx.repo.owner}/${ctx.repo.name}`)
  
  // Create issue
  const response = yield* client.request(octokit =>
    octokit.rest.issues.create({
      owner: ctx.repo.owner,
      repo: ctx.repo.name,
      title,
      labels
    })
  )
  
  yield* runner.info(`Created issue #${response.data.number}`)
  
  // Set outputs
  yield* Output.set("issue-number", String(response.data.number))
  yield* Output.set("issue-url", response.data.html_url)
})

// Run - errors handled automatically
Action.runMain(program)
```

---

## Testing

### Test Layers

| Layer | Purpose |
|-------|---------|
| `ActionRunnerTest.make(config)` | Mock runner with configurable inputs |
| `ActionContextTest.make(data)` | Mock context data |
| `ActionClientTest.make(responses?)` | Mock API responses |
| `ActionSummaryTest.make()` | Capture summary buffer |

### Example Test

```typescript
import { Input, ActionRunnerTest } from "@effect-native/platform-github"
import { Effect, Schema } from "effect"
import { describe, it, expect } from "@effect/vitest"

describe("Input", () => {
  it.effect("parses integer input", () =>
    Effect.gen(function* () {
      const count = yield* Input.parse("count", Schema.NumberFromString)
      expect(count).toBe(42)
    }).pipe(
      Effect.provide(ActionRunnerTest.make({
        inputs: { count: "42" }
      }))
    )
  )
  
  it.effect("fails on invalid integer", () =>
    Effect.gen(function* () {
      const result = yield* Input.parse("count", Schema.NumberFromString).pipe(
        Effect.either
      )
      expect(result._tag).toBe("Left")
    }).pipe(
      Effect.provide(ActionRunnerTest.make({
        inputs: { count: "not-a-number" }
      }))
    )
  )
})
```
