# Example Suggestions: `effect/unstable/workflow/Workflow`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts`
- **Uncovered API records:** 39
- **Priorities:** 5 required, 10 recommended, 22 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/Workflow.intoResult`                |  659 | `root-declaration` | **required**    |
| `effect/unstable/workflow/Workflow.scope`                     |  771 | `root-declaration` | **required**    |
| `effect/unstable/workflow/Workflow.provideScope`              |  786 | `root-declaration` | **required**    |
| `effect/unstable/workflow/Workflow.addFinalizer`              |  798 | `root-declaration` | **required**    |
| `effect/unstable/workflow/Workflow.suspend`                   |  859 | `root-declaration` | **required**    |
| `effect/unstable/workflow/Workflow.withCompensation`          |  831 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.make`                      |  429 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.isResult`                  |  471 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.Complete`                  |  533 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.Suspended`                 |  605 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.Result (value)`            |  626 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.ResultEncoded (value)`     |  642 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.wrapActivityResult`        |  722 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.CaptureDefects`            |  876 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.SuspendOnFailure`          |  893 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Workflow.AnyStructSchema`           |  195 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.Result (type)`             |  482 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.ResultEncoded (type)`      |  490 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.CompleteEncoded`           |  501 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.CompleteSchema`            |  513 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow`                  |   45 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.annotate`         |   65 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.annotateMerge`    |   73 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.execute`          |   80 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.poll`             |   97 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.interrupt`        |  108 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.resume`           |  115 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.toLayer`          |  123 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.executionId`      |  147 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Workflow.withCompensation` |  162 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Execution`                 |  206 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.Any`                       |  218 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.AnyWithProps`              |  239 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.PayloadSchema`             |  258 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.RequirementsClient`        |  273 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.RequirementsHandler`       |  291 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Workflow.Complete.Schema`           |  548 | `member`           | **optional**    |
| `effect/unstable/workflow/Workflow.Complete.ResultTypeId`     |  541 | `member`           | **discouraged** |
| `effect/unstable/workflow/Workflow.Suspended.ResultTypeId`    |  616 | `member`           | **discouraged** |

## Required

### `effect/unstable/workflow/Workflow.intoResult`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:659`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **required**
- **Current description:** Runs an effect as a workflow execution and converts its outcome into a `Result`, handling suspension, defect capture, interruption, and workflow scope finalization.
- **Signature hint:** `declare function intoResult<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<Result<A, E>, never, Exclude<R, Scope.Scope> | WorkflowInstance>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.intoResult`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Workflow.intoResult`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/unstable/workflow/Workflow.scope`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:771`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Accesses the workflow scope, which is only closed when the workflow execution fully completes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.scope`.
- **Suggested snippet:** Use `Workflow.scope` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/unstable/workflow/Workflow.provideScope`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:786`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Provides the workflow scope to the given effect, and closes the scope only when the workflow execution fully completes.
- **Signature hint:** `declare function provideScope<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, Scope.Scope> | WorkflowInstance>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.provideScope`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Workflow.provideScope`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/unstable/workflow/Workflow.addFinalizer`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:798`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Adds an exit finalizer to the current workflow scope, preserving the services available when the finalizer is registered.
- **Signature hint:** `declare function addFinalizer<R>(f: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<void, never, R>): Effect.Effect<void, never, WorkflowInstance | R>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.addFinalizer`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Workflow.addFinalizer`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/unstable/workflow/Workflow.suspend`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:859`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **required**
- **Current description:** Marks a workflow instance as suspended and interrupts the current fiber to stop execution until it is resumed.
- **Signature hint:** `declare function suspend(instance: WorkflowInstance['Service']): Effect.Effect<never>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.suspend`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Workflow.suspend`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/workflow/Workflow.withCompensation`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:831`
- **Kind / category:** `root-declaration` / `Compensation`
- **Priority:** **recommended**
- **Current description:** Adds compensation logic to an effect inside a Workflow.
- **Signature hint:** `declare function withCompensation<A, R2>(compensation: (value: A, cause: Cause.Cause<unknown>) => Effect.Effect<void, never, R2>): <E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | R2 | WorkflowInstance | Scope.Scope> declare function withCompensation<A, E, R, R2>(effect: Effect.Effect<A, E, R>, compensation: (value: A, cause: Cause.Cause<unknown>) => Effect.Effect<void, never, R2>): Effect.Effect<A, E, R | R2 | WorkflowInstance | Scope.Scope>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.withCompensation`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Workflow.withCompensation`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.make`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:429`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a durable workflow definition with schemas, annotations, and deterministic execution IDs derived from the workflow tag and idempotency key.
- **Signature hint:** `declare function make<const Tag extends string, Payload extends Schema.Struct.Fields | AnyStructSchema, Success extends Schema.Top = Schema.Void, Error extends Schema.Top = Schema.Never>(tag: Tag, options: { readonly payload: Payload; readonly idempotencyKey: (payload: Payload extends Schema.Struct.Fields ? Schema.Struct.Type<Payload> : Payload['Type']) => string; readonly success?: Success; readonly error?: Error; readonly suspendedRetrySchedule?: Schedule.Schedule<any, unknown> | undefined; readonly annotations?: Context.Context<never>; }): Workflow<Tag, Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload, Success, Error>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.make`.
- **Suggested snippet:** Construct one representative value with `Workflow.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.isResult`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:471`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a workflow `Result`.
- **Signature hint:** `declare function isResult<A = unknown, E = unknown>(u: unknown): u is Result<A, E>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.isResult`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Workflow.isResult` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.Complete`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:533`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **recommended**
- **Current description:** Represents a completed workflow execution with its success or failure `Exit`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.Complete`.
- **Suggested snippet:** Use `Workflow.Complete` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.Suspended`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:605`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **recommended**
- **Current description:** Represents a suspended workflow execution, optionally carrying the cause that triggered suspension.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.Suspended`.
- **Suggested snippet:** Use `Workflow.Suspended` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.Result (value)`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:626`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **recommended**
- **Current description:** Creates a schema for workflow results using the supplied success and error schemas.
- **Signature hint:** `declare function Result<Success extends Schema.Constraint, Error extends Schema.Constraint>(options: { readonly success: Success; readonly error: Error; }): Schema.Union<readonly [CompleteSchema<Success, Error>, typeof Suspended]>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.Result`.
- **Suggested snippet:** Define the smallest domain Schema involving `Workflow.Result`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.ResultEncoded (value)`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:642`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **recommended**
- **Current description:** Schema for encoded workflow results with generic success and error payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.ResultEncoded`.
- **Suggested snippet:** Use `Workflow.ResultEncoded` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.wrapActivityResult`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:722`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **recommended**
- **Current description:** Wraps an activity-like effect so workflow suspension waits for currently running activities to finish or suspend.
- **Signature hint:** `declare function wrapActivityResult<A, E, R>(effect: Effect.Effect<A, E, R>, isSuspend: (value: A) => boolean): Effect.Effect<A, E, R | WorkflowInstance>`
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.wrapActivityResult`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Workflow.wrapActivityResult`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.CaptureDefects`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:876`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **recommended**
- **Current description:** Captures defects for a workflow and includes them in the result of the workflow or its activities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.CaptureDefects`.
- **Suggested snippet:** Consume `Workflow.CaptureDefects` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Workflow.SuspendOnFailure`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:893`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **recommended**
- **Current description:** Marks a workflow to suspend when it encounters any error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Workflow } from "effect/unstable/workflow"` and use `Workflow.SuspendOnFailure`.
- **Suggested snippet:** Consume `Workflow.SuspendOnFailure` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/Workflow.AnyStructSchema`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:195`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema constraint for workflow payload schemas that expose struct fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.AnyStructSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Result (type)`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:482`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **optional**
- **Current description:** Result of a workflow execution, either a completed exit or a suspended workflow state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.Result`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.ResultEncoded (type)`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:490`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **optional**
- **Current description:** Encoded representation of a workflow `Result`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.ResultEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.CompleteEncoded`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:501`
- **Kind / category:** `root-declaration` / `results`
- **Priority:** **optional**
- **Current description:** Encoded representation of a completed workflow result containing an encoded `Exit`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.CompleteEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.CompleteSchema`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:513`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema constructor for `Complete` workflow results using the supplied success and error schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.CompleteSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:45`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Durable workflow definition with typed payload, success, and error schemas plus operations for execution, polling, interruption, resumption, and registration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.Workflow`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.annotate`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:65`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an annotation to the workflow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.annotateMerge`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Merge multiple annotations into the workflow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.execute`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Execute the workflow with the given payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.execute` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.poll`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:97`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Poll the current status of a workflow execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.poll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.interrupt`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:108`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Interrupt a workflow execution for the given execution ID.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.interrupt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.resume`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Manually resume a workflow execution for the given execution ID.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.resume` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.toLayer`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:123`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a layer that registers the workflow and provides an effect to execute it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.toLayer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.executionId`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:147`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** For the given payload, compute the deterministic execution ID.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.executionId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Workflow.withCompensation`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:162`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add compensation logic to an effect inside a Workflow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Workflow.withCompensation` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Execution`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:206`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level marker for services associated with a specific workflow execution tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.Execution`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Any`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:218`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased workflow shape for APIs that operate on workflows without preserving their specific payload, success, or error types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.AnyWithProps`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:239`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased workflow shape that also exposes executable operations needed by workflow proxy and engine helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.PayloadSchema`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:258`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the payload schema from a `Workflow`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.PayloadSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.RequirementsClient`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:273`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the schema services required by clients that execute or poll workflows.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.RequirementsClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.RequirementsHandler`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:291`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the schema services required by handlers that decode workflow payloads and encode workflow results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Workflow.RequirementsHandler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Workflow.Complete.Schema`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:548`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the schema for completed workflow results from success and error schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/workflow/Workflow.Complete.Schema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workflow/Workflow.Complete.ResultTypeId`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:541`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a workflow result for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/workflow/Workflow.Complete.ResultTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/workflow/Workflow.Suspended.ResultTypeId`

- **Source:** `packages/effect/src/unstable/workflow/Workflow.ts:616`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a workflow result for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/workflow/Workflow.Suspended.ResultTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
