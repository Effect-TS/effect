# @effect-native/platform-github Requirements

## Functional Requirements

### FR-1: ActionRunner Service

#### FR-1.1: Input Operations

**FR-1.1.1** (Event-Driven)
When `getInput` is called with an input name,
the System shall return the value from the `INPUT_{NAME}` environment variable (uppercase, spaces to underscores).

**FR-1.1.2** (Event-Driven)
When `getInput` is called with `required: true` and the input is empty,
the System shall fail with an `ActionInputError` containing reason "MissingRequired" and the input name.

**FR-1.1.3** (Event-Driven)
When `getInput` is called with `trimWhitespace: true` (default),
the System shall trim leading and trailing whitespace from the value.

**FR-1.1.4** (Event-Driven)
When `getMultilineInput` is called,
the System shall return an array of non-empty lines from the input value.

**FR-1.1.5** (Event-Driven)
When `getBooleanInput` is called with a value matching `true|True|TRUE|false|False|FALSE`,
the System shall return the corresponding boolean.

**FR-1.1.6** (Event-Driven)
When `getBooleanInput` is called with a non-matching value,
the System shall fail with an `ActionInputError` containing reason "InvalidBoolean".

#### FR-1.2: Output Operations

**FR-1.2.1** (Event-Driven)
When `setOutput` is called with a name and value,
the System shall write the output to the `GITHUB_OUTPUT` file in the required format.

#### FR-1.3: Logging Operations

**FR-1.3.1** (Event-Driven)
When `debug` is called with a message,
the System shall emit a `::debug::` command to stdout.

**FR-1.3.2** (Event-Driven)
When `info` is called with a message,
the System shall write the message to stdout with a newline.

**FR-1.3.3** (Event-Driven)
When `warning` is called with a message and optional properties,
the System shall emit a `::warning::` command to stdout with the message and properties.

**FR-1.3.4** (Event-Driven)
When `error` is called with a message and optional properties,
the System shall emit an `::error::` command to stdout with the message and properties.

**FR-1.3.5** (Event-Driven)
When `notice` is called with a message and optional properties,
the System shall emit a `::notice::` command to stdout with the message and properties.

**FR-1.3.6** (State-Driven)
While `RUNNER_DEBUG` equals "1",
the `isDebug` property shall return `true`.

#### FR-1.4: Group Operations

**FR-1.4.1** (Event-Driven)
When `startGroup` is called with a name,
the System shall emit a `::group::` command to stdout.

**FR-1.4.2** (Event-Driven)
When `endGroup` is called,
the System shall emit an `::endgroup::` command to stdout.

**FR-1.4.3** (Event-Driven)
When `group` is called with a name and an Effect,
the System shall:
1. Call `startGroup` before executing the Effect
2. Execute the provided Effect
3. Call `endGroup` after the Effect completes (success or failure)

#### FR-1.5: Environment Operations

**FR-1.5.1** (Event-Driven)
When `exportVariable` is called with a name and value,
the System shall:
1. Write to the `GITHUB_ENV` file in the required format
2. Set `process.env[name]` to the stringified value

**FR-1.5.2** (Event-Driven)
When `addPath` is called with a path,
the System shall:
1. Write to the `GITHUB_PATH` file
2. Prepend to `process.env.PATH`

**FR-1.5.3** (Event-Driven)
When `setSecret` is called with a value,
the System shall emit an `::add-mask::` command to mask the value in logs.

#### FR-1.6: State Operations

**FR-1.6.1** (Event-Driven)
When `saveState` is called with a name and value,
the System shall write to the `GITHUB_STATE` file in the required format.

**FR-1.6.2** (Event-Driven)
When `getState` is called with a name,
the System shall return the value from the `STATE_{NAME}` environment variable.

#### FR-1.7: Result Operations

**FR-1.7.1** (Event-Driven)
When `setFailed` is called with a message,
the System shall:
1. Set `process.exitCode` to 1
2. Emit an error annotation with the message

#### FR-1.8: OIDC Operations

**FR-1.8.1** (Event-Driven)
When `getIDToken` is called and `ACTIONS_ID_TOKEN_REQUEST_URL` is not set,
the System shall fail with an `ActionOIDCError` containing reason "MissingEnvironment".

**FR-1.8.2** (Event-Driven)
When `getIDToken` is called with valid environment,
the System shall request a JWT token from the OIDC provider and return it.

**FR-1.8.3** (Unwanted Behavior)
If the OIDC token request fails,
the System shall fail with an `ActionOIDCError` containing reason "RequestFailed".

---

### FR-2: ActionContext Service

#### FR-2.1: Event Properties

**FR-2.1.1** (Ubiquitous)
The `payload` property shall return the parsed JSON from `GITHUB_EVENT_PATH`.

**FR-2.1.2** (Ubiquitous)
The `eventName` property shall return the value of `GITHUB_EVENT_NAME`.

#### FR-2.2: Commit Properties

**FR-2.2.1** (Ubiquitous)
The `sha` property shall return the value of `GITHUB_SHA`.

**FR-2.2.2** (Ubiquitous)
The `ref` property shall return the value of `GITHUB_REF`.

#### FR-2.3: Workflow Properties

**FR-2.3.1** (Ubiquitous)
The `workflow` property shall return the value of `GITHUB_WORKFLOW`.

**FR-2.3.2** (Ubiquitous)
The `action` property shall return the value of `GITHUB_ACTION`.

**FR-2.3.3** (Ubiquitous)
The `actor` property shall return the value of `GITHUB_ACTOR`.

**FR-2.3.4** (Ubiquitous)
The `job` property shall return the value of `GITHUB_JOB`.

#### FR-2.4: Run Properties

**FR-2.4.1** (Ubiquitous)
The `runAttempt` property shall return the integer value of `GITHUB_RUN_ATTEMPT`.

**FR-2.4.2** (Ubiquitous)
The `runNumber` property shall return the integer value of `GITHUB_RUN_NUMBER`.

**FR-2.4.3** (Ubiquitous)
The `runId` property shall return the integer value of `GITHUB_RUN_ID`.

#### FR-2.5: URL Properties

**FR-2.5.1** (Ubiquitous)
The `apiUrl` property shall return `GITHUB_API_URL` or default to `https://api.github.com`.

**FR-2.5.2** (Ubiquitous)
The `serverUrl` property shall return `GITHUB_SERVER_URL` or default to `https://github.com`.

**FR-2.5.3** (Ubiquitous)
The `graphqlUrl` property shall return `GITHUB_GRAPHQL_URL` or default to `https://api.github.com/graphql`.

#### FR-2.6: Computed Properties

**FR-2.6.1** (Event-Driven)
When `repo` is accessed and `GITHUB_REPOSITORY` is set,
the System shall return `{ owner, repo }` parsed from `owner/repo` format.

**FR-2.6.2** (Event-Driven)
When `repo` is accessed and `GITHUB_REPOSITORY` is not set,
the System shall attempt to read from `payload.repository`.

**FR-2.6.3** (Unwanted Behavior)
If neither `GITHUB_REPOSITORY` nor `payload.repository` is available,
the System shall fail with an `ActionContextError` containing reason "MissingRepository".

**FR-2.6.4** (Event-Driven)
When `issue` is accessed,
the System shall return `{ owner, repo, number }` combining `repo` with the issue/PR number from the payload.

---

### FR-3: ActionClient Service

#### FR-3.1: Client Access

**FR-3.1.1** (Event-Driven)
When `octokit` is accessed,
the System shall return a configured Octokit instance with REST methods and pagination.

**FR-3.1.2** (Ubiquitous)
The Octokit instance shall be configured with the provided authentication token.

**FR-3.1.3** (Ubiquitous)
The Octokit instance shall respect `GITHUB_API_URL` for GitHub Enterprise Server support.

#### FR-3.2: Request Helpers

**FR-3.2.1** (Event-Driven)
When `request` is called with a function that invokes Octokit,
the System shall execute the function and return the result wrapped in an Effect.

**FR-3.2.2** (Unwanted Behavior)
If the Octokit request fails,
the System shall fail with an `ActionApiError` containing the status code and message.

**FR-3.2.3** (Event-Driven)
When `graphql` is called with a query and variables,
the System shall execute the GraphQL query and return the result wrapped in an Effect.

**FR-3.2.4** (Event-Driven)
When `paginate` is called with a paginated endpoint,
the System shall collect all pages and return the combined results as an array.

---

### FR-4: ActionSummary Service

#### FR-4.1: Content Building

**FR-4.1.1** (Event-Driven)
When any `add*` method is called,
the System shall append the corresponding HTML to an internal buffer and return the summary instance.

**FR-4.1.2** (Ubiquitous)
The `addCodeBlock` method shall wrap content in `<pre><code>` tags with optional language attribute.

**FR-4.1.3** (Ubiquitous)
The `addTable` method shall generate a `<table>` with `<tr>`, `<th>`, and `<td>` elements.

**FR-4.1.4** (Ubiquitous)
The `addDetails` method shall generate a `<details><summary>` element.

#### FR-4.2: Buffer Operations

**FR-4.2.1** (Event-Driven)
When `stringify` is called,
the System shall return the current buffer contents as a string.

**FR-4.2.2** (Event-Driven)
When `emptyBuffer` is called,
the System shall clear the buffer and return the summary instance.

**FR-4.2.3** (Event-Driven)
When `isEmptyBuffer` is called,
the System shall return `true` if the buffer is empty.

#### FR-4.3: File Operations

**FR-4.3.1** (Event-Driven)
When `write` is called,
the System shall append the buffer contents to the file at `GITHUB_STEP_SUMMARY`.

**FR-4.3.2** (Event-Driven)
When `write` is called with `overwrite: true`,
the System shall replace the file contents instead of appending.

**FR-4.3.3** (Event-Driven)
When `clear` is called,
the System shall empty the buffer and truncate the summary file.

**FR-4.3.4** (Unwanted Behavior)
If `GITHUB_STEP_SUMMARY` is not set,
the System shall fail with an `ActionSummaryError` containing reason "MissingPath".

---

### FR-5: Error Types

#### FR-5.1: ActionInputError

**FR-5.1.1** (Ubiquitous)
The `ActionInputError` shall have a `reason` field with values: "MissingRequired", "InvalidBoolean", "InvalidFormat".

**FR-5.1.2** (Ubiquitous)
The `ActionInputError` shall include the input `name` and optionally the invalid `value`.

**FR-5.1.3** (Ubiquitous)
The `message` getter shall return an actionable description of the error.

#### FR-5.2: ActionContextError

**FR-5.2.1** (Ubiquitous)
The `ActionContextError` shall have a `reason` field with values: "MissingRepository", "InvalidPayload".

#### FR-5.3: ActionApiError

**FR-5.3.1** (Ubiquitous)
The `ActionApiError` shall include optional `status`, `message`, `endpoint`, and `rateLimitReset` fields.

**FR-5.3.2** (Ubiquitous)
The `isRateLimited` getter shall return `true` if the error is due to rate limiting.

#### FR-5.4: ActionOIDCError

**FR-5.4.1** (Ubiquitous)
The `ActionOIDCError` shall have a `reason` field with values: "MissingEnvironment", "RequestFailed", "TokenInvalid".

#### FR-5.5: ActionSummaryError

**FR-5.5.1** (Ubiquitous)
The `ActionSummaryError` shall have a `reason` field with values: "MissingPath", "WriteError".

---

### FR-6: Layer Support

#### FR-6.1: Live Layers

**FR-6.1.1** (Ubiquitous)
The package shall export `ActionRunner.layer` providing a live implementation.

**FR-6.1.2** (Ubiquitous)
The package shall export `ActionContext.layer` providing a live implementation.

**FR-6.1.3** (Ubiquitous)
The package shall export `ActionClient.layer(token)` providing a live implementation.

**FR-6.1.4** (Ubiquitous)
The package shall export `ActionSummary.layer` providing a live implementation.

**FR-6.1.5** (Ubiquitous)
The package shall export `Action.layer(token)` combining all services.

#### FR-6.2: Test Layers

**FR-6.2.1** (Ubiquitous)
The package shall export test/mock layers for each service.

---

## Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1**
Input retrieval operations shall complete in under 1ms (they read from environment variables).

**NFR-1.2**
Logging operations shall not block the main Effect fiber.

### NFR-2: Compatibility

**NFR-2.1**
The package shall work with Node.js versions 18, 20, and 22.

**NFR-2.2**
The package shall work with the `node20` GitHub Actions runner.

**NFR-2.3**
The package shall support GitHub Enterprise Server via environment variable configuration.

### NFR-3: Documentation

**NFR-3.1**
All public exports shall have JSDoc with `@since` and `@category` tags.

**NFR-3.2**
Error messages shall be actionable and include relevant context.

### NFR-4: Testing

**NFR-4.1**
All services shall have corresponding test suites.

**NFR-4.2**
Tests shall be runnable without a GitHub Actions environment.

---

## Constraints

### C-1: Dependencies

**C-1.1**
The package shall depend on `@actions/core` for runner communication.

**C-1.2**
The package shall depend on `@actions/github` for context and Octokit.

**C-1.3**
The package shall use Effect peer dependencies matching the effect-native monorepo.

### C-2: Effect Patterns

**C-2.1**
All services shall use the TypeId pattern with `Symbol.for()`.

**C-2.2**
All services shall use `Context.GenericTag` for dependency injection.

**C-2.3**
Error types shall use `Schema.TaggedError` or `Data.TaggedError`.

### C-3: Package Structure

**C-3.1**
The package shall be located at `packages-native/platform-github/`.

**C-3.2**
The package shall follow the effect-native monorepo conventions for configuration.
