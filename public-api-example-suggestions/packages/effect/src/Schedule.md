# Example Suggestions: `effect/Schedule`

- **Package:** `effect`
- **Source:** `packages/effect/src/Schedule.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 3 recommended, 9 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind                    | Priority        |
| ----------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Schedule.toStepWithMetadata`      |  377 | `root-declaration`      | **recommended** |
| `effect/Schedule.jittered`                | 1093 | `root-declaration`      | **recommended** |
| `effect/Schedule.while`                   | 1376 | `root-declaration`      | **recommended** |
| `effect/Schedule.Error`                   |  176 | `root-declaration`      | **optional**    |
| `effect/Schedule.Env`                     |  184 | `root-declaration`      | **optional**    |
| `effect/Schedule.InputMetadata`           |   63 | `root-declaration`      | **optional**    |
| `effect/Schedule.Metadata`                |   78 | `root-declaration`      | **optional**    |
| `effect/Schedule.CurrentMetadata`         |   96 | `root-declaration`      | **optional**    |
| `effect/Schedule.Output`                  |  160 | `root-declaration`      | **optional**    |
| `effect/Schedule.Input`                   |  168 | `root-declaration`      | **optional**    |
| `effect/Schedule.identity`                | 1474 | `root-declaration`      | **optional**    |
| `effect/Schedule.Schedule`                |  114 | `namespace`             | **optional**    |
| `effect/Schedule.Schedule.VarianceStruct` |  146 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/Schedule.toStepWithMetadata`

- **Source:** `packages/effect/src/Schedule.ts:377`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **recommended**
- **Current description:** Extracts a step function from a `Schedule` that sleeps for each computed delay and returns metadata for the completed step.
- **Signature hint:** `declare function toStepWithMetadata<Output, Input, Error, Env>(schedule: Schedule<Output, Input, Error, Env>): Effect<(input: Input) => Pull.Pull<Metadata<Output, Input>, Error, Output, Env>, never, Env>`
- **Import guidance:** Start from `import { Schedule } from "effect"` and use `Schedule.toStepWithMetadata`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Schedule.toStepWithMetadata`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schedule.jittered`

- **Source:** `packages/effect/src/Schedule.ts:1093`
- **Kind / category:** `root-declaration` / `delays & timeouts`
- **Priority:** **recommended**
- **Current description:** Returns a new `Schedule` that randomly adjusts each recurrence delay.
- **Signature hint:** `declare function jittered<Output, Input, Error, Env>(self: Schedule<Output, Input, Error, Env>): Schedule<Output, Input, Error, Env>`
- **Import guidance:** Start from `import { Schedule } from "effect"` and use `Schedule.jittered`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a new `Schedule` that randomly adjusts each recurrence delay. Call `Schedule.jittered` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schedule.while`

- **Source:** `packages/effect/src/Schedule.ts:1376`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Returns a new schedule that continues while the predicate returns `true`.
- **Signature hint:** `declare const _while: { <Input, Output, Error2 = never, Env2 = never>(predicate: (metadata: Metadata<Output, Input>) => boolean | Effect<boolean, Error2, Env2>): <Error, Env>(self: Schedule<Output, Input, Error, Env>) => Schedule<Output, Input, Error | Error2, Env | Env2>; <Output, Input, Error, Env, Error2 = never, Env2 = never>(self: Schedule<Output, Input, Error, Env>, predicate: (metadata: Metadata<Output, Input>) => boolean | Effect<boolean, Error2, Env2>): Schedule<Output, Input, Error | Error2, Env | Env2>; } export { _while as while }`
- **Import guidance:** Start from `import { Schedule } from "effect"` and use `Schedule.while`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a new schedule that continues while the predicate returns `true`. Call `Schedule.while` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Schedule.Error`

- **Source:** `packages/effect/src/Schedule.ts:176`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the error type from a `Schedule`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.Env`

- **Source:** `packages/effect/src/Schedule.ts:184`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the service requirements from a `Schedule`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.Env`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.InputMetadata`

- **Source:** `packages/effect/src/Schedule.ts:63`
- **Kind / category:** `root-declaration` / `metadata`
- **Priority:** **optional**
- **Current description:** Metadata provided to schedule functions containing timing and input information.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.InputMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.Metadata`

- **Source:** `packages/effect/src/Schedule.ts:78`
- **Kind / category:** `root-declaration` / `metadata`
- **Priority:** **optional**
- **Current description:** Extended metadata that includes both input metadata and the output value from the schedule.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.Metadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.CurrentMetadata`

- **Source:** `packages/effect/src/Schedule.ts:96`
- **Kind / category:** `root-declaration` / `metadata`
- **Priority:** **optional**
- **Current description:** Context reference containing metadata for the currently running schedule step.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schedule } from "effect"` and use `Schedule.CurrentMetadata`.
- **Suggested snippet:** Consume `Schedule.CurrentMetadata` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.Output`

- **Source:** `packages/effect/src/Schedule.ts:160`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the output type from a `Schedule`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.Output`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.Input`

- **Source:** `packages/effect/src/Schedule.ts:168`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the input type from a `Schedule`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.Input`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.identity`

- **Source:** `packages/effect/src/Schedule.ts:1474`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a schedule that always recurs, passing inputs directly as outputs.
- **Signature hint:** `declare function identity<A>(): Schedule<A, A>`
- **Import guidance:** Start from `import { Schedule } from "effect"` and use `Schedule.identity`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a schedule that always recurs, passing inputs directly as outputs. Call `Schedule.identity` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schedule.Schedule`

- **Source:** `packages/effect/src/Schedule.ts:114`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** The Schedule namespace contains types and utilities for working with schedules.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schedule.Schedule`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Schedule.Schedule.VarianceStruct`

- **Source:** `packages/effect/src/Schedule.ts:146`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level marker used by `Schedule.Variance` to record the variance of `Schedule` type parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Schedule.Schedule.VarianceStruct` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
