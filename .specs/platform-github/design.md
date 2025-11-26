# @effect-native/platform-github Design

## Architecture Overview

The package provides three main capabilities:

1. **Runtime**: `GitHubRuntime.runMain` for running Effects as GitHub Actions with proper error handling
2. **Platform Layer**: Implementations of `@effect/platform` services for GitHub Actions runtime
3. **Action Framework**: Declarative schema-based inputs/outputs inspired by `@effect/cli`

### Core Design Principle: No Magic Strings

**Programs must never need to know environment variable names.**

All GitHub Actions environment data is exposed through:
- Typed services (ActionContext, ActionRunner, etc.)
- Schema-validated inputs (Input<A>)
- Schema-validated outputs (Output<A>)

There is no legitimate reason for a program to access `process.env.GITHUB_*` directly. The platform layer handles all environment interaction internally.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        User's Action Code                                │
│  Effect.gen(function* () {                                              │
│    const { token, owner, repo } = yield* myInputs                       │
│    const ctx = yield* ActionContext                                     │
│    const fs = yield* FileSystem                                         │
│    // ... action logic using @effect/platform abstractions              │
│    yield* Outputs.set(myOutputs, { issueNumber: 42 })                   │
│  })                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GitHubContext.layer                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  FileSystem  │ │     Path     │ │   Terminal   │ │ HttpClient   │   │
│  │   (Node)     │ │   (Node)     │ │  (Actions)   │ │   (Node)     │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
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

## Package Structure

### File Organization

```
src/
├── index.ts                    # Package exports
│
├── # Runtime (like NodeRuntime, BunRuntime)
├── GitHubRuntime.ts            # runMain for GitHub Actions
│
├── # Declarative I/O (like @effect/cli)
├── Input.ts                    # Input<A> definition and primitives
├── Inputs.ts                   # Composition and combinators
├── Output.ts                   # Output<A> definition and primitives
├── Outputs.ts                  # Composition and combinators
├── Action.ts                   # Action definition helper
│
├── # GitHub-specific services
├── ActionContext.ts            # Workflow context service
├── ActionRunner.ts             # Low-level runner communication
├── ActionClient.ts             # GitHub API client
├── ActionSummary.ts            # Job summary builder
├── ActionError.ts              # Error types
│
├── # Platform layer
├── GitHubContext.ts            # Combined platform layer
├── GitHubTerminal.ts           # Actions-aware Terminal impl
│
└── internal/
    ├── runtime.ts
    ├── input.ts
    ├── inputs.ts
    ├── output.ts
    ├── outputs.ts
    ├── action.ts
    ├── actionContext.ts
    ├── actionRunner.ts
    ├── actionClient.ts
    ├── actionSummary.ts
    └── githubTerminal.ts
```

---

## GitHubRuntime

### runMain

The primary entry point for running an Effect as a GitHub Action. Similar to `NodeRuntime.runMain` and `BunRuntime.runMain`, but with GitHub Actions-specific behavior.

**Key difference from NodeRuntime.runMain**: The error type must be `never`, forcing explicit error handling within the program. Unhandled defects are caught and reported via `setFailed`.

**Signature**:
```
runMain: (options?: RunMainOptions) => <A>(effect: Effect<A, never, GitHubContext>) => void
runMain: <A>(effect: Effect<A, never, GitHubContext>, options?: RunMainOptions) => void
```

**RunMainOptions**:
- disableErrorReporting: boolean (default false) - Turn off automatic error logging
- disablePrettyLogger: boolean (default false) - Use default logger instead of pretty

**Behavior**:
1. Provides `GitHubContext.layer` automatically (FileSystem, Path, Terminal, ActionRunner, etc.)
2. Runs the Effect to completion
3. On success: exits with code 0
4. On defect (unexpected error): calls `setFailed` with defect message, exits with code 1
5. On interrupt (SIGINT/SIGTERM): interrupts fiber, exits gracefully

**Why `never` error type?**

GitHub Actions have a binary outcome: success or failure. By requiring `E = never`, the type system ensures:
- All expected errors are explicitly handled within the program
- The program decides how to handle each error case (retry, fail, warn, etc.)
- Only truly unexpected defects cause action failure

**Example**:
```typescript
import { GitHubRuntime, ActionRunner } from "@effect-native/platform-github"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const runner = yield* ActionRunner
  yield* runner.info("Hello from GitHub Action!")
  
  // All errors must be handled - this won't compile with unhandled errors:
  yield* someEffectThatCanFail.pipe(
    Effect.catchAll((error) => 
      runner.warning(`Non-fatal error: ${error.message}`)
    )
  )
})

// Type: Effect<void, never, GitHubContext>
GitHubRuntime.runMain(program)
```

**Handling expected failures**:
```typescript
const program = Effect.gen(function* () {
  const runner = yield* ActionRunner
  
  yield* riskyOperation.pipe(
    Effect.catchTag("NetworkError", (e) => 
      // Decide: is this fatal?
      runner.setFailed(`Network error: ${e.message}`)
    ),
    Effect.catchTag("ValidationError", (e) =>
      // Non-fatal, just warn
      runner.warning(`Validation issue: ${e.message}`)
    )
  )
})
```

---

## Declarative Input System

### Design Philosophy

**No magic strings, ever.**

The input name (e.g., "token") is only specified once - in the Input definition. Programs never need to know that this maps to `INPUT_TOKEN` environment variable. The platform handles all environment interaction.

**Schema-first validation.**

All inputs are validated against their schemas before the program runs. This ensures:
- Type errors are caught immediately
- Clear error messages reference input names, not env vars
- Programs receive fully-typed, validated data

### Input<A> Type

`Input<A>` is a description of how to obtain a value of type `A` from action inputs.

**Tag Identifier**: "@effect-native/platform-github/Input"

**Internal AST structure** (similar to @effect/cli):

- Empty - yields void
- Single - single named input with primitive type
- Map - transformed input
- Both - two inputs combined
- Optional - wrapped in Option
- WithDefault - has fallback value
- WithSchema - validated against Schema
- WithFallbackConfig - Config fallback
- WithDescription - documentation

### Input Primitives

Each primitive is backed by an implicit Schema:

| Constructor | Return Type | Implicit Schema |
|-------------|-------------|-----------------|
| `Input.text(name)` | `Input<string>` | `Schema.String` |
| `Input.integer(name)` | `Input<number>` | `Schema.NumberFromString` + integer check |
| `Input.float(name)` | `Input<number>` | `Schema.NumberFromString` |
| `Input.boolean(name)` | `Input<boolean>` | YAML 1.2 boolean schema |
| `Input.secret(name)` | `Input<Redacted<string>>` | `Schema.Redacted(Schema.String)` |
| `Input.multiline(name)` | `Input<Array<string>>` | Split + `Schema.Array(Schema.String)` |
| `Input.json(name)` | `Input<unknown>` | `Schema.parseJson(Schema.Unknown)` |
| `Input.choice(name, choices)` | `Input<A>` | `Schema.Literal(...choices)` |

### Schema-Based Input

For full control, use `Input.schema`:

```typescript
const MyConfig = Schema.Struct({
  retries: Schema.Number,
  timeout: Schema.Number,
  tags: Schema.Array(Schema.String)
})

// Parses JSON input and validates against schema
const configInput = Input.schema("config", MyConfig)
// Type: Input<{ retries: number; timeout: number; tags: string[] }>
```

### Input Combinators

| Combinator | Effect |
|------------|--------|
| `Inputs.all({ a, b })` | Combine to object `{ a: A, b: B }` |
| `input.pipe(Inputs.optional)` | Wrap in `Option<A>` |
| `input.pipe(Inputs.withDefault(v))` | Use default if missing |
| `input.pipe(Inputs.withSchema(s))` | Additional schema validation |
| `input.pipe(Inputs.withDescription(d))` | Add documentation |
| `input.pipe(Inputs.withFallbackConfig(c))` | Try Effect Config if missing |
| `input.pipe(Inputs.fromContext(fn))` | Derive default from ActionContext |
| `input.pipe(Inputs.map(f))` | Transform value |

### Input Parsing

Inputs are parsed eagerly when the action starts. By the time your program runs, all inputs are validated and typed:

```typescript
const inputs = Inputs.all({
  token: Input.secret("token"),
  owner: Input.text("owner").pipe(
    Inputs.fromContext(ctx => ctx.repo.owner)  // default from context
  ),
  count: Input.integer("count").pipe(
    Inputs.withDefault(10)
  )
})

// In program - inputs are already parsed and typed
const program = Effect.gen(function* () {
  const { token, owner, count } = yield* inputs
  // token: Redacted<string>
  // owner: string  
  // count: number
})
```

### Error Messages

Validation errors reference the input name, never environment variables:

```
InputValidationError: Required input 'token' was not provided
InputValidationError: Input 'count' must be an integer, got 'abc'
InputValidationError: Input 'config' failed schema validation:
  - retries: expected number, got string
```

---

## Declarative Output System

### Output<A> Type

`Output<A>` is a description of how to write a value of type `A` to action outputs.

**Tag Identifier**: "@effect-native/platform-github/Output"

### Output Primitives

| Constructor | Return Type | Behavior |
|-------------|-------------|----------|
| `Output.text(name)` | `Output<string>` | Write string |
| `Output.integer(name)` | `Output<number>` | Write number |
| `Output.boolean(name)` | `Output<boolean>` | Write boolean |
| `Output.json(name)` | `Output<unknown>` | Serialize as JSON |

### Output Combinators

| Combinator | Effect |
|------------|--------|
| `Outputs.all({ a, b })` | Combine to object schema |
| `output.pipe(Outputs.optional)` | Value is optional |
| `output.pipe(Outputs.withSchema(s))` | Validate before writing |

### Output Writing

**Set signature**:
```
Outputs.set: <A>(outputs: Outputs<A>, values: A) => Effect<void, never, ActionRunner>
```

---

## Action Definition

### Action.make

Creates a complete action definition with typed inputs and outputs:

```
Action.make(name, config, handler)
```

**Parameters**:
- name: string - Action name for logging/identification
- config.inputs: Input<I> - Declarative input schema
- config.outputs: Outputs<O> - Declarative output schema
- handler: (inputs: I) => Effect<O, E, R> - Action logic

**Returns**: `Action<I, O, E, R>`

### Action.run

Executes an action with full lifecycle management:

```
Action.run(action)
```

**Behavior**:
1. Initialize GitHubContext layer
2. Parse inputs according to schema
3. Execute handler with parsed inputs
4. Write outputs according to schema
5. Handle errors (call setFailed, set exit code)
6. Handle success (exit code 0)

---

## Platform Layer

### GitHubContext

Combines all platform services for GitHub Actions:

**Type**:
```
type GitHubContext =
  | FileSystem
  | Path
  | CommandExecutor
  | Terminal
  | ActionContext
  | ActionRunner
  | ActionSummary
```

**Layer composition**:
```
GitHubContext.layer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  NodeCommandExecutor.layer,
  GitHubTerminal.layer,
  ActionContext.layer,
  ActionRunner.layer,
  ActionSummary.layer
)
```

### GitHubTerminal

Custom Terminal implementation that maps to runner commands:

| Terminal Method | Runner Output |
|-----------------|---------------|
| write (stdout) | Direct stdout |
| writeLine | stdout + EOL |
| log | ::debug:: if RUNNER_DEBUG, else info |

---

## Service Specifications

### ActionContext

**Tag Identifier**: "@effect-native/platform-github/ActionContext"

Provides fully-typed, schema-validated access to all GitHub Actions context. Programs never need to know environment variable names - everything is accessed through this service.

**Schema Types** (defined with @effect/schema):

```
// All context data is validated at layer construction
ActionContextData = Schema.Struct({
  // Event information
  eventName: Schema.String,
  payload: WebhookPayload,
  
  // Git information  
  sha: Schema.String,              // commit SHA
  ref: Schema.String,              // refs/heads/main, refs/tags/v1, etc.
  
  // Workflow information
  workflow: Schema.String,         // workflow name
  action: Schema.String,           // action name or step id
  actor: Schema.String,            // user who triggered
  job: Schema.String,              // job id
  
  // Run information
  runId: Schema.Number,            // unique run identifier
  runNumber: Schema.Number,        // run number for this workflow
  runAttempt: Schema.Number,       // attempt number (for re-runs)
  
  // URLs (for API access, GitHub Enterprise support)
  apiUrl: Schema.String,           // https://api.github.com or GHES URL
  serverUrl: Schema.String,        // https://github.com or GHES URL
  graphqlUrl: Schema.String,       // GraphQL endpoint
  
  // Repository (validated structure)
  repo: Schema.Struct({
    owner: Schema.String,
    name: Schema.String
  }),
  
  // Issue/PR context (when applicable)
  issue: Schema.optional(Schema.Struct({
    owner: Schema.String,
    repo: Schema.String,
    number: Schema.Number
  }))
})
```

**Service interface**:

The service exposes the validated data directly - no Effects needed for simple property access since validation happens at startup:

| Property | Type | Description |
|----------|------|-------------|
| eventName | string | Event that triggered workflow |
| payload | WebhookPayload | Full webhook payload (typed) |
| sha | string | Commit SHA |
| ref | string | Git ref |
| workflow | string | Workflow name |
| action | string | Action/step identifier |
| actor | string | Triggering user |
| job | string | Job identifier |
| runId | number | Unique run ID |
| runNumber | number | Run number |
| runAttempt | number | Attempt number |
| apiUrl | string | API base URL |
| serverUrl | string | Server base URL |
| graphqlUrl | string | GraphQL endpoint |
| repo | { owner, name } | Repository info |
| issue | Option<{ owner, repo, number }> | Issue/PR info if applicable |

**Why eager validation?**

Context is validated once when `GitHubContext.layer` is constructed. If any required environment data is missing or malformed, the layer fails immediately with a clear error - before the program runs. This ensures programs can rely on context data being present and correctly typed.

### ActionRunner (Low-Level)

**Tag Identifier**: "@effect-native/platform-github/ActionRunner"

For advanced use cases when declarative I/O doesn't fit:

| Method | Purpose |
|--------|---------|
| debug(msg) | Write debug message |
| info(msg) | Write info message |
| warning(msg, props?) | Create warning annotation |
| error(msg, props?) | Create error annotation |
| notice(msg, props?) | Create notice annotation |
| startGroup(name) | Begin log group |
| endGroup | End log group |
| group(name, effect) | Run in group |
| exportVariable(name, value) | Set env var |
| addPath(path) | Add to PATH |
| setSecret(secret) | Mask in logs |
| saveState(name, value) | Save state |
| getState(name) | Get state |
| setFailed(msg) | Fail action |
| getIDToken(audience?) | Get OIDC token |

### ActionClient

**Tag Identifier**: "@effect-native/platform-github/ActionClient"

| Method | Purpose |
|--------|---------|
| octokit | Get configured Octokit instance |
| request(fn) | Effect-wrapped API request |
| graphql(query, vars?) | Effect-wrapped GraphQL |
| paginate(fn) | Collect paginated results |

### ActionSummary

**Tag Identifier**: "@effect-native/platform-github/ActionSummary"

Chainable builder returning ActionSummary:

| Method | HTML Output |
|--------|-------------|
| addRaw(text) | Raw text |
| addCodeBlock(code, lang?) | `<pre><code>` |
| addList(items, ordered?) | `<ul>` or `<ol>` |
| addTable(rows) | `<table>` |
| addDetails(label, content) | `<details>` |
| addImage(src, alt, opts?) | `<img>` |
| addHeading(text, level?) | `<h1>`-`<h6>` |
| addSeparator() | `<hr>` |
| addBreak() | `<br>` |
| addQuote(text, cite?) | `<blockquote>` |
| addLink(text, href) | `<a>` |

Effect methods:

| Method | Purpose |
|--------|---------|
| write(opts?) | Write buffer to file |
| clear() | Clear buffer and file |

---

## Error Types

### InputValidationError

**Fields**:
- input: string (input name)
- reason: "MissingRequired" | "InvalidType" | "InvalidSchema" | "InvalidChoice"
- value: optional (the invalid value)
- parseError: optional Schema.ParseError

**Message examples**:
- "Required input 'token' was not supplied"
- "Input 'count' expected integer but got 'abc'"
- "Input 'email' failed validation: expected valid email format"

### ActionContextError

**Fields**:
- reason: "MissingRepository" | "InvalidPayload"
- details: optional string

### ActionApiError

**Fields**:
- status: optional number
- message: string
- endpoint: optional string
- rateLimitReset: optional Date

### ActionOIDCError

**Fields**:
- reason: "MissingEnvironment" | "RequestFailed"
- details: optional string

### ActionSummaryError

**Fields**:
- reason: "MissingPath" | "WriteError"
- details: optional string

---

## Usage Examples

### Example 1: Simple Action with GitHubRuntime.runMain

```typescript
import { GitHubRuntime, ActionContext, ActionRunner } from "@effect-native/platform-github"
import { Effect } from "effect"

// Program with error type = never (all errors handled)
const program = Effect.gen(function* () {
  const ctx = yield* ActionContext
  const runner = yield* ActionRunner
  
  yield* runner.info(`Running in ${ctx.repo.owner}/${ctx.repo.name}`)
  yield* runner.info(`Triggered by: ${ctx.actor}`)
  yield* runner.info(`Event: ${ctx.eventName}`)
})

// Run - GitHubContext provided automatically
GitHubRuntime.runMain(program)
```

### Example 2: Declarative Inputs and Outputs

```typescript
import { 
  GitHubRuntime, 
  Input, 
  Inputs, 
  Output, 
  Outputs,
  ActionContext,
  ActionClient 
} from "@effect-native/platform-github"
import { Effect, Option } from "effect"

// Define inputs declaratively - names specified once, never again
const inputs = Inputs.all({
  token: Input.secret("token").pipe(
    Inputs.withDescription("GitHub token for authentication")
  ),
  title: Input.text("title").pipe(
    Inputs.withDescription("Issue title")
  ),
  body: Input.text("body").pipe(
    Inputs.optional,
    Inputs.withDescription("Issue body (optional)")
  ),
  labels: Input.multiline("labels").pipe(
    Inputs.withDefault([]),
    Inputs.withDescription("Labels to add, one per line")
  )
})

// Define outputs declaratively
const outputs = Outputs.all({
  issueNumber: Output.integer("issue-number"),
  issueUrl: Output.text("issue-url")
})

// Program receives fully-typed, validated inputs
const program = Effect.gen(function* () {
  // Parse inputs - validated against schemas
  const { token, title, body, labels } = yield* inputs
  // token: Redacted<string>
  // title: string
  // body: Option<string>
  // labels: string[]
  
  const ctx = yield* ActionContext
  const client = yield* ActionClient
  
  // Use typed context - no env vars needed
  const { owner, name } = ctx.repo
  
  const response = yield* client.request(octokit =>
    octokit.rest.issues.create({
      owner,
      repo: name,
      title,
      body: Option.getOrUndefined(body),
      labels
    })
  ).pipe(
    // Handle API errors explicitly
    Effect.catchTag("ActionApiError", (e) =>
      Effect.fail(new Error(`Failed to create issue: ${e.message}`))
    )
  )
  
  // Set outputs
  yield* Outputs.set(outputs, {
    issueNumber: response.data.number,
    issueUrl: response.data.html_url
  })
}).pipe(
  // All errors must be handled - setFailed for fatal errors
  Effect.catchAll((error) =>
    Effect.flatMap(ActionRunner, runner =>
      runner.setFailed(error.message)
    )
  )
)

// Type: Effect<void, never, GitHubContext>
GitHubRuntime.runMain(program)
```

### Example 3: Using Platform Services

```typescript
import { GitHubRuntime, ActionRunner } from "@effect-native/platform-github"
import { FileSystem, Path } from "@effect/platform"
import { Effect } from "effect"

// Standard @effect/platform code - works on GitHub Actions
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const runner = yield* ActionRunner
  
  // Read file using platform FileSystem
  const content = yield* fs.readFileString("package.json")
  const pkg = JSON.parse(content)
  
  yield* runner.info(`Package: ${pkg.name}@${pkg.version}`)
  
  // Write output file
  const outPath = path.join("dist", "report.json")
  yield* fs.writeFileString(outPath, JSON.stringify({ success: true }))
}).pipe(
  Effect.catchAll((error) =>
    Effect.flatMap(ActionRunner, r => r.setFailed(String(error)))
  )
)

GitHubRuntime.runMain(program)
```

### Example 4: Schema-Validated JSON Input

```typescript
import { GitHubRuntime, Input, Inputs } from "@effect-native/platform-github"
import { Schema } from "@effect/schema"
import { Effect } from "effect"

// Define a schema for complex input
const DeployConfig = Schema.Struct({
  environment: Schema.Literal("staging", "production"),
  regions: Schema.Array(Schema.String),
  replicas: Schema.Number.pipe(Schema.int(), Schema.positive()),
  features: Schema.optional(Schema.Record(Schema.String, Schema.Boolean))
})

// Input that parses and validates JSON against schema
const configInput = Input.schema("config", DeployConfig)

const program = Effect.gen(function* () {
  // Fully typed and validated
  const config = yield* configInput
  // config: { environment: "staging" | "production"; regions: string[]; ... }
  
  yield* Effect.log(`Deploying to ${config.environment}`)
  yield* Effect.log(`Regions: ${config.regions.join(", ")}`)
})
```

---

## Composition Patterns (Documentation)

**No custom composition APIs are provided.** Use Effect's native primitives.

### Sub-Actions are Functions

A "sub-action" is simply a function returning Effect:

```typescript
// Define a reusable sub-action as a function
const build = (target: string): Effect<BuildResult, BuildError, FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    // ... build logic
    return { artifact: `dist/${target}/app`, size: 12345 }
  })

// Or as a service for late-binding
interface BuildService {
  build: (target: string) => Effect<BuildResult, BuildError>
}
const BuildService = Context.GenericTag<BuildService>("BuildService")
```

### Sequential Composition

Use `Effect.gen` with `yield*`:

```typescript
const program = Effect.gen(function* () {
  const buildResult = yield* build("linux")
  const testResult = yield* test(buildResult)
  const deployResult = yield* deploy(testResult)
  return { buildResult, testResult, deployResult }
})
```

### Parallel Composition

Use `Effect.all`:

```typescript
// All must succeed (fail-fast)
const results = yield* Effect.all([
  build("linux"),
  build("macos"),
  build("windows")
], { concurrency: 3 })

// Collect all results including failures
const results = yield* Effect.allSettled([
  build("linux"),
  build("macos")
])
```

### Map Pattern

Use `Effect.forEach`:

```typescript
const targets = ["linux", "macos", "windows"]
const results = yield* Effect.forEach(
  targets,
  (target) => build(target),
  { concurrency: "unbounded" }
)
```

### Error Handling

Use `Effect.catchTag` or `Effect.catchAll`:

```typescript
yield* deploy(input).pipe(
  Effect.catchTag("DeployError", (e) =>
    Effect.fail(new RetryableError({ cause: e }))
  )
)
```

### Cleanup on Failure

Use `Effect.onError` for compensation:

```typescript
yield* deploy(input).pipe(
  Effect.onError(() => rollback(input))
)
```

For ordered cleanup, use Scope:

```typescript
yield* Effect.scoped(
  Effect.gen(function* () {
    yield* Effect.addFinalizer((exit) =>
      Exit.isFailure(exit) ? unpublish() : Effect.void
    )
    yield* publish()

    yield* Effect.addFinalizer((exit) =>
      Exit.isFailure(exit) ? rollback() : Effect.void
    )
    yield* deploy()

    yield* healthCheck()
  })
)
```

---

## Testing Support

### Test Layers

| Layer | Purpose |
|-------|---------|
| `GitHubContext.layerTest(config)` | Full mock platform |
| `ActionContext.layerTest(data)` | Mock context data |
| `ActionRunner.layerTest(inputs?)` | Mock with input values |
| `ActionClient.layerTest(responses?)` | Mock API responses |
| `ActionSummary.layerTest` | Capture summary buffer |

### Test Utilities

| Utility | Purpose |
|---------|---------|
| `Input.parseTest(input, inputs)` | Parse with mock env |
| `Action.runTest(action, inputs)` | Run with mock environment |
