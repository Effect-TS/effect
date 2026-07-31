# Example Suggestions: `effect/unstable/workflow/DurableDeferred`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts`
- **Uncovered API records:** 23
- **Priorities:** 0 required, 11 recommended, 10 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                               | Line | Kind               | Priority        |
| ----------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/DurableDeferred.raceAll`                |  255 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.make`                   |   84 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.await`                  |  165 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.into`                   |  175 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.Token (value)`          |  323 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.TokenParsed`            |  332 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.token`                  |  407 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.done`                   |  504 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.succeed`                |  556 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.fail`                   |  591 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.failCause`              |  626 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableDeferred.Token (type)`           |  315 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableDeferred.tokenFromExecutionId`   |  425 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableDeferred.tokenFromPayload`       |  459 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableDeferred.DurableDeferred`        |   38 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableDeferred.Any`                    |   57 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableDeferred.AnyWithProps`           |   69 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableDeferred.TokenParsed.asToken`    |  344 | `member`           | **optional**    |
| `effect/unstable/workflow/DurableDeferred.TokenParsed.FromString` |  355 | `member`           | **optional**    |
| `effect/unstable/workflow/DurableDeferred.TokenParsed.fromString` |  390 | `member`           | **optional**    |
| `effect/unstable/workflow/DurableDeferred.TokenParsed.encode`     |  397 | `member`           | **optional**    |
| `effect/unstable/workflow/DurableDeferred.TokenTypeId (value)`    |  298 | `root-declaration` | **discouraged** |
| `effect/unstable/workflow/DurableDeferred.TokenTypeId (type)`     |  306 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/workflow/DurableDeferred.raceAll`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:255`
- **Kind / category:** `root-declaration` / `racing`
- **Priority:** **recommended**
- **Current description:** Runs effects as a durable race, returning a previously persisted result when present or completing a named deferred with the first result.
- **Signature hint:** `declare function raceAll<const Effects extends NonEmptyReadonlyArray<Effect.Effect<any, any, any>>, Success extends Schema.Schema<Effect.Success<Effects[number]>>, Error extends Schema.Schema<Effect.Error<Effects[number]>>>(options: { name: string; success: Success; error: Error; effects: Effects; }): Effect.Effect<Effect.Success<Effects[number]>, Effect.Error<Effects[number]>, Effect.Services<Effects[number]> | Success['DecodingServices'] | Success['EncodingServices'] | Error['DecodingServices'] | Error['EncodingServices'] | WorkflowEngine | WorkflowInstance>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.raceAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.raceAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.make`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:84`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a named durable deferred with optional success and error schemas for persisted completion.
- **Signature hint:** `declare function make<Success extends Schema.Constraint = Schema.Void, Error extends Schema.Constraint = Schema.Never>(name: string, options?: { readonly success?: Success | undefined; readonly error?: Error | undefined; }): DurableDeferred<Success, Error>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.make`.
- **Suggested snippet:** Construct one representative value with `DurableDeferred.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.await`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:165`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Waits for the durable deferred, suspending the current workflow when no persisted completion is available.
- **Signature hint:** `declare function await<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>): Effect.Effect<Success['Type'], Error['Type'], WorkflowEngine | WorkflowInstance | Success['DecodingServices'] | Error['DecodingServices']>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.await`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.await`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.into`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:175`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect and records its exit into the durable deferred, resuming workflows that are waiting on that deferred.
- **Signature hint:** `declare function into<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>): <R>(effect: Effect.Effect<Success['Type'], Error['Type'], R>) => Effect.Effect<Success['Type'], Error['Type'], R | WorkflowEngine | WorkflowInstance | Success['DecodingServices'] | Error['DecodingServices']> declare function into<Success extends Schema.Constraint, Error extends Schema.Constraint, R>(effect: Effect.Effect<Success['Type'], Error['Type'], R>, self: DurableDeferred<Success, Error>): Effect.Effect<Success['Type'], Error['Type'], R | WorkflowEngine | WorkflowInstance | Success['DecodingServices'] | Error['DecodingServices']>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.into`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.into`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.Token (value)`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:323`
- **Kind / category:** `root-declaration` / `token`
- **Priority:** **recommended**
- **Current description:** Schema for branded durable deferred tokens.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.Token`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `DurableDeferred.Token`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.TokenParsed`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:332`
- **Kind / category:** `root-declaration` / `token`
- **Priority:** **recommended**
- **Current description:** Schema for a decoded durable deferred token containing the workflow name, execution ID, and deferred name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.TokenParsed`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `DurableDeferred.TokenParsed`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.token`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:407`
- **Kind / category:** `root-declaration` / `token`
- **Priority:** **recommended**
- **Current description:** Creates a token for a durable deferred using the current workflow instance's workflow name and execution ID.
- **Signature hint:** `declare function token<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>): Effect.Effect<Token, never, WorkflowInstance>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.token`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.token`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.done`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:504`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Completes the durable deferred identified by a token with the supplied exit, encoding the result through the deferred schemas.
- **Signature hint:** `declare function done<Success extends Schema.Constraint, Error extends Schema.Constraint>(options: { readonly token: Token; readonly exit: Exit.Exit<Success['Type'], Error['Type']>; }): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Success['EncodingServices'] | Error['EncodingServices']> declare function done<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>, options: { readonly token: Token; readonly exit: Exit.Exit<Success['Type'], Error['Type']>; }): Effect.Effect<void, never, WorkflowEngine | Success['EncodingServices'] | Error['EncodingServices']>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.done`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.done`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.succeed`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:556`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Completes the durable deferred identified by a token with a successful value.
- **Signature hint:** `declare function succeed<Success extends Schema.Constraint, Error extends Schema.Constraint>(options: { readonly token: Token; readonly value: Success['Type']; }): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Success['EncodingServices']> declare function succeed<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>, options: { readonly token: Token; readonly value: Success['Type']; }): Effect.Effect<void, never, WorkflowEngine | Success['EncodingServices']>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.succeed`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.succeed`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.fail`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:591`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Completes the durable deferred identified by a token with a typed failure.
- **Signature hint:** `declare function fail<Success extends Schema.Constraint, Error extends Schema.Constraint>(options: { readonly token: Token; readonly error: Error['Type']; }): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Error['EncodingServices']> declare function fail<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>, options: { readonly token: Token; readonly error: Error['Type']; }): Effect.Effect<void, never, WorkflowEngine | Error['EncodingServices']>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.fail`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.fail`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableDeferred.failCause`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:626`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Completes the durable deferred identified by a token with a failure cause.
- **Signature hint:** `declare function failCause<Success extends Schema.Constraint, Error extends Schema.Constraint>(options: { readonly token: Token; readonly cause: Cause.Cause<Error['Type']>; }): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Error['EncodingServices']> declare function failCause<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>, options: { readonly token: Token; readonly cause: Cause.Cause<Error['Type']>; }): Effect.Effect<void, never, WorkflowEngine | Error['EncodingServices']>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.failCause`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.failCause`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/DurableDeferred.Token (type)`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:315`
- **Kind / category:** `root-declaration` / `token`
- **Priority:** **optional**
- **Current description:** Branded string token identifying a durable deferred for a workflow execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/DurableDeferred.Token`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.tokenFromExecutionId`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:425`
- **Kind / category:** `root-declaration` / `token`
- **Priority:** **optional**
- **Current description:** Creates a durable deferred token from an explicit workflow, execution ID, and deferred name.
- **Signature hint:** `declare function tokenFromExecutionId(options: { readonly workflow: Workflow.Any; readonly executionId: string; }): <Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>) => Token declare function tokenFromExecutionId<Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>, options: { readonly workflow: Workflow.Any; readonly executionId: string; }): Token`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.tokenFromExecutionId`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `DurableDeferred.tokenFromExecutionId`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.tokenFromPayload`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:459`
- **Kind / category:** `root-declaration` / `token`
- **Priority:** **optional**
- **Current description:** Creates a durable deferred token by deriving the workflow execution ID from the supplied workflow payload.
- **Signature hint:** `declare function tokenFromPayload<W extends Workflow.Any>(options: { readonly workflow: W; readonly payload: Workflow.PayloadSchema<W>['~type.make.in']; }): <Success extends Schema.Constraint, Error extends Schema.Constraint>(self: DurableDeferred<Success, Error>) => Effect.Effect<Token> declare function tokenFromPayload<Success extends Schema.Constraint, Error extends Schema.Constraint, W extends Workflow.Any>(self: DurableDeferred<Success, Error>, options: { readonly workflow: W; readonly payload: Workflow.PayloadSchema<W>['~type.make.in']; }): Effect.Effect<Token>`
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.tokenFromPayload`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableDeferred.tokenFromPayload`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.DurableDeferred`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:38`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Named durable deferred value whose completion is persisted by the workflow engine and encoded with success and error schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/DurableDeferred.DurableDeferred`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.Any`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:57`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased durable deferred shape for APIs that only need the deferred identity and name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/DurableDeferred.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.AnyWithProps`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:69`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased durable deferred shape that also exposes success, error, and exit schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/DurableDeferred.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.TokenParsed.asToken`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:344`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Encodes the parsed workflow, execution, and deferred names back into a token.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/DurableDeferred.TokenParsed.asToken` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.TokenParsed.FromString`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:355`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Schema for decoding and encoding durable deferred tokens as strings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/DurableDeferred.TokenParsed.FromString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.TokenParsed.fromString`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:390`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Decodes a durable deferred token string into its parsed components.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/DurableDeferred.TokenParsed.fromString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableDeferred.TokenParsed.encode`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:397`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Encodes parsed durable deferred token components into a token string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/DurableDeferred.TokenParsed.encode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workflow/DurableDeferred.TokenTypeId (value)`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:298`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand identifier for durable deferred tokens.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DurableDeferred } from "effect/unstable/workflow"` and use `DurableDeferred.TokenTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `DurableDeferred.TokenTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/workflow/DurableDeferred.TokenTypeId (type)`

- **Source:** `packages/effect/src/unstable/workflow/DurableDeferred.ts:306`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level brand identifier for `Token` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/workflow/DurableDeferred.TokenTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
