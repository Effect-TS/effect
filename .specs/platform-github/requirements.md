# @effect-native/platform-github Requirements

## Architectural Requirements

### AR-1: Platform Compatibility

**AR-1.1** (Ubiquitous)
Code written using `@effect/platform` abstractions (FileSystem, Path, Terminal, HttpClient, etc.) shall execute correctly when provided with `@effect-native/platform-github` layers.

**AR-1.2** (Ubiquitous)
The package shall export a `GitHubContext` layer that provides all platform services, analogous to `NodeContext` from `@effect/platform-node`.

**AR-1.3** (Ubiquitous)
The package shall re-use Node.js implementations for services where GitHub Actions runners are Node-based (FileSystem, Path, CommandExecutor).

### AR-2: No Magic Strings

**AR-2.1** (Ubiquitous)
Programs shall NOT need to know any environment variable names (GITHUB_*, INPUT_*, etc.).

**AR-2.2** (Ubiquitous)
All environment data shall be accessible exclusively through typed services and Schema-validated inputs/outputs.

**AR-2.3** (Ubiquitous)
There shall be no legitimate reason for a program to access `process.env` directly.

### AR-3: Declarative Input/Output

**AR-3.1** (Ubiquitous)
Action inputs shall be defined declaratively using a schema-based API, similar to `@effect/cli` Args and Options.

**AR-3.2** (Ubiquitous)
Action outputs shall be defined declaratively using a schema-based API.

**AR-3.3** (Ubiquitous)
All inputs and outputs shall be validated against Effect Schemas automatically.

**AR-3.4** (Ubiquitous)
The package shall NOT require manual `getInput()` calls inside program bodies.

### AR-4: Runtime Entry Point

**AR-4.1** (Ubiquitous)
The package shall provide `GitHubRuntime.runMain` analogous to `NodeRuntime.runMain` and `BunRuntime.runMain`.

**AR-4.2** (Ubiquitous)
`GitHubRuntime.runMain` shall require the program error type to be `never`, forcing explicit error handling.

**AR-4.3** (Ubiquitous)
`GitHubRuntime.runMain` shall automatically provide `GitHubContext.layer`.

**AR-4.4** (Ubiquitous)
On defects (unhandled exceptions), `GitHubRuntime.runMain` shall call `setFailed` and exit with code 1.

### AR-5: Eager Validation

**AR-5.1** (Ubiquitous)
ActionContext shall be validated at layer construction time, before the program runs.

**AR-5.2** (Ubiquitous)
Input schemas shall be validated eagerly when inputs are parsed, before the program logic executes.

**AR-5.3** (Ubiquitous)
Validation errors shall reference input/context names, never environment variable names.

---

## Functional Requirements

### FR-1: Inputs (Declarative Schema)

#### FR-1.1: Input Primitives

**FR-1.1.1** (Ubiquitous)
The `Inputs.text(name)` constructor shall return an `Input<string>` that reads from `INPUT_{NAME}`.

**FR-1.1.2** (Ubiquitous)
The `Inputs.integer(name)` constructor shall return an `Input<number>` that parses an integer.

**FR-1.1.3** (Ubiquitous)
The `Inputs.boolean(name)` constructor shall return an `Input<boolean>` that parses YAML 1.2 booleans.

**FR-1.1.4** (Ubiquitous)
The `Inputs.secret(name)` constructor shall return an `Input<Redacted<string>>` and automatically mask the value in logs.

**FR-1.1.5** (Ubiquitous)
The `Inputs.multiline(name)` constructor shall return an `Input<Array<string>>` splitting by newlines.

**FR-1.1.6** (Ubiquitous)
The `Inputs.json(name)` constructor shall return an `Input<unknown>` that parses JSON.

#### FR-1.2: Input Composition

**FR-1.2.1** (Event-Driven)
When `Inputs.all({ a, b, c })` is called with named inputs,
the System shall return an `Input<{ a: A; b: B; c: C }>`.

**FR-1.2.2** (Event-Driven)
When `input.pipe(Inputs.optional)` is called,
the System shall return an `Input<Option<A>>` that succeeds with `None` if missing.

**FR-1.2.3** (Event-Driven)
When `input.pipe(Inputs.withDefault(value))` is called,
the System shall return an `Input<A>` that uses the default if missing.

**FR-1.2.4** (Event-Driven)
When `input.pipe(Inputs.withSchema(schema))` is called,
the System shall validate the parsed value against the Schema.

**FR-1.2.5** (Event-Driven)
When `input.pipe(Inputs.withDescription(text))` is called,
the System shall associate the description for documentation/help generation.

#### FR-1.3: Input Fallbacks

**FR-1.3.1** (Event-Driven)
When `input.pipe(Inputs.withFallbackConfig(config))` is called,
the System shall try the Config if the input is not provided.

**FR-1.3.2** (Event-Driven)
When `input.pipe(Inputs.fromContext(fn))` is called,
the System shall derive the default from ActionContext (e.g., repo owner).

#### FR-1.4: Input Validation

**FR-1.4.1** (Unwanted Behavior)
If a required input is missing,
the System shall fail with an `InputValidationError` containing the input name.

**FR-1.4.2** (Unwanted Behavior)
If an input fails schema validation,
the System shall fail with an `InputValidationError` containing the parse error.

---

### FR-2: Outputs (Declarative Schema)

#### FR-2.1: Output Primitives

**FR-2.1.1** (Ubiquitous)
The `Outputs.text(name)` constructor shall return an `Output<string>`.

**FR-2.1.2** (Ubiquitous)
The `Outputs.integer(name)` constructor shall return an `Output<number>`.

**FR-2.1.3** (Ubiquitous)
The `Outputs.boolean(name)` constructor shall return an `Output<boolean>`.

**FR-2.1.4** (Ubiquitous)
The `Outputs.json(name)` constructor shall return an `Output<unknown>` that serializes to JSON.

#### FR-2.2: Output Composition

**FR-2.2.1** (Event-Driven)
When `Outputs.all({ a, b, c })` is called with named outputs,
the System shall return an `Outputs<{ a: A; b: B; c: C }>`.

**FR-2.2.2** (Event-Driven)
When `output.pipe(Outputs.withSchema(schema))` is called,
the System shall validate values before writing.

#### FR-2.3: Output Operations

**FR-2.3.1** (Event-Driven)
When `Outputs.set(outputs, values)` is called,
the System shall write all output values to `GITHUB_OUTPUT` in the required format.

---

### FR-3: Action Definition

#### FR-3.1: Action Constructor

**FR-3.1.1** (Ubiquitous)
The `Action.make(name, config, handler)` constructor shall create an action definition with:
- name: Action identifier
- config.inputs: Declarative input schema
- config.outputs: Declarative output schema
- handler: Effect that receives parsed inputs and returns outputs

**FR-3.1.2** (Ubiquitous)
The handler function shall receive strongly-typed parsed inputs.

**FR-3.1.3** (Ubiquitous)
The handler function shall return values matching the output schema.

#### FR-3.2: Action Execution

**FR-3.2.1** (Event-Driven)
When `Action.run(action)` is called,
the System shall:
1. Parse all inputs according to their schemas
2. Execute the handler with parsed inputs
3. Write outputs according to their schemas
4. Set exit code based on success/failure

**FR-3.2.2** (Unwanted Behavior)
If the handler fails,
the System shall call `setFailed` with the error message and set exit code to 1.

---

### FR-4: ActionContext Service

**FR-4.1** (Ubiquitous)
The `ActionContext` service shall provide typed access to workflow execution context.

**FR-4.2** (Ubiquitous)
Context properties shall include: payload, eventName, sha, ref, workflow, action, actor, job, runAttempt, runNumber, runId, apiUrl, serverUrl, graphqlUrl.

**FR-4.3** (Ubiquitous)
Computed properties `repo` and `issue` shall be derived from environment and payload.

---

### FR-5: ActionClient Service

**FR-5.1** (Ubiquitous)
The `ActionClient` service shall provide an Effect-wrapped Octokit instance.

**FR-5.2** (Event-Driven)
When `ActionClient.request(fn)` is called,
the System shall execute the Octokit function and convert errors to `ActionApiError`.

---

### FR-6: ActionRunner Service (Low-Level)

**FR-6.1** (Ubiquitous)
The `ActionRunner` service shall provide direct access to runner communication for advanced use cases.

**FR-6.2** (Ubiquitous)
Methods shall include: debug, info, warning, error, notice, startGroup, endGroup, group, exportVariable, addPath, setSecret, saveState, getState, setFailed, getIDToken.

**FR-6.3** (Ubiquitous)
Users should prefer declarative Inputs/Outputs over direct ActionRunner methods.

---

### FR-7: ActionSummary Service

**FR-7.1** (Ubiquitous)
The `ActionSummary` service shall provide a chainable job summary builder.

**FR-7.2** (Ubiquitous)
Content methods shall include: addRaw, addCodeBlock, addList, addTable, addDetails, addImage, addHeading, addSeparator, addBreak, addQuote, addLink.

**FR-7.3** (Event-Driven)
When `ActionSummary.write()` is called,
the System shall write the buffer to `GITHUB_STEP_SUMMARY`.

---

### FR-8: Platform Services

#### FR-8.1: GitHubContext Layer

**FR-8.1.1** (Ubiquitous)
The `GitHubContext.layer` shall provide:
- FileSystem (from @effect/platform-node)
- Path (from @effect/platform-node)
- CommandExecutor (from @effect/platform-node)
- Terminal (GitHub Actions-aware logging)
- ActionContext
- ActionRunner
- ActionSummary

#### FR-8.2: Terminal Implementation

**FR-8.2.1** (Ubiquitous)
The GitHub Actions Terminal implementation shall map logging to runner commands.

**FR-8.2.2** (Ubiquitous)
Debug output shall emit `::debug::` commands.

**FR-8.2.3** (Ubiquitous)
Terminal shall respect `RUNNER_DEBUG` for debug output visibility.

---

### FR-9: Error Types

**FR-9.1** (Ubiquitous)
`InputValidationError` shall contain: input name, reason, value (if applicable), parse error (if applicable).

**FR-9.2** (Ubiquitous)
`ActionContextError` shall contain: reason (MissingRepository, InvalidPayload).

**FR-9.3** (Ubiquitous)
`ActionApiError` shall contain: status, message, endpoint, rateLimitReset.

**FR-9.4** (Ubiquitous)
`ActionOIDCError` shall contain: reason (MissingEnvironment, RequestFailed).

**FR-9.5** (Ubiquitous)
`ActionSummaryError` shall contain: reason (MissingPath, WriteError).

---

## Non-Functional Requirements

### NFR-1: Compatibility

**NFR-1.1**
The package shall work with Node.js versions 18, 20, and 22.

**NFR-1.2**
The package shall work with the `node20` GitHub Actions runner.

**NFR-1.3**
The package shall support GitHub Enterprise Server via environment variables.

### NFR-2: Performance

**NFR-2.1**
Input parsing shall complete in under 10ms for typical action inputs.

**NFR-2.2**
Platform layer initialization shall complete in under 50ms.

### NFR-3: Documentation

**NFR-3.1**
All public exports shall have JSDoc with `@since` and `@category` tags.

**NFR-3.2**
Error messages shall be actionable and include input names/context.

**NFR-3.3**
Input schemas shall support description generation for action.yml.

### NFR-4: Testing

**NFR-4.1**
All services shall have mock layers for testing.

**NFR-4.2**
Tests shall run without GitHub Actions environment.

---

## Constraints

### C-1: Dependencies

**C-1.1**
The package shall depend on `@actions/core` and `@actions/github`.

**C-1.2**
The package shall depend on `@effect/platform-node-shared` for Node implementations.

**C-1.3**
Effect packages shall be peer dependencies.

### C-2: Effect Patterns

**C-2.1**
All services shall use TypeId + Context.GenericTag pattern.

**C-2.2**
Error types shall use Schema.TaggedError or Data.TaggedError.

**C-2.3**
Inputs/Outputs shall follow @effect/cli composition patterns.

### C-3: Package Structure

**C-3.1**
The package shall be located at `packages-native/platform-github/`.

**C-3.2**
The package shall follow effect-native monorepo conventions.
