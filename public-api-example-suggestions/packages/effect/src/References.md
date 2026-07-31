# Example Suggestions: `effect/References`

- **Package:** `effect`
- **Source:** `packages/effect/src/References.ts`
- **Uncovered API records:** 11
- **Priorities:** 1 required, 2 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `effect/References.UnhandledLogLevel`     |  587 | `root-declaration` | **required**    |
| `effect/References.Tracer`                |  124 | `root-declaration` | **recommended** |
| `effect/References.CurrentLoggers`        |  631 | `root-declaration` | **recommended** |
| `effect/References.CurrentTraceLevel`     |   37 | `root-declaration` | **optional**    |
| `effect/References.DisablePropagation`    |   56 | `root-declaration` | **optional**    |
| `effect/References.MaxOpsBeforeYield`     |   74 | `root-declaration` | **optional**    |
| `effect/References.MinimumTraceLevel`     |   88 | `root-declaration` | **optional**    |
| `effect/References.PreventSchedulerYield` |  112 | `root-declaration` | **optional**    |
| `effect/References.CurrentStackFrame`     |  321 | `root-declaration` | **optional**    |
| `effect/References.StackFrame`            |  607 | `root-declaration` | **optional**    |
| `effect/References.LogToStderr`           |  649 | `root-declaration` | **optional**    |

## Required

### `effect/References.UnhandledLogLevel`

- **Source:** `packages/effect/src/References.ts:587`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **required**
- **Current description:** Context reference for the log severity used when a pool finalizer reports an unhandled error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.UnhandledLogLevel`.
- **Suggested snippet:** Consume `References.UnhandledLogLevel` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/References.Tracer`

- **Source:** `packages/effect/src/References.ts:124`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **recommended**
- **Current description:** Context reference for the active tracer service used to create spans.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.Tracer`.
- **Suggested snippet:** Consume `References.Tracer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/References.CurrentLoggers`

- **Source:** `packages/effect/src/References.ts:631`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **recommended**
- **Current description:** Context reference for the set of loggers currently used by Effect logging operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.CurrentLoggers`.
- **Suggested snippet:** Consume `References.CurrentLoggers` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/References.CurrentTraceLevel`

- **Source:** `packages/effect/src/References.ts:37`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the current trace level used for dynamic trace filtering.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.CurrentTraceLevel`.
- **Suggested snippet:** Consume `References.CurrentTraceLevel` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.DisablePropagation`

- **Source:** `packages/effect/src/References.ts:56`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for disabling trace propagation in the current context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.DisablePropagation`.
- **Suggested snippet:** Consume `References.DisablePropagation` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.MaxOpsBeforeYield`

- **Source:** `packages/effect/src/References.ts:74`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the maximum operation budget before a fiber yields to the scheduler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.MaxOpsBeforeYield`.
- **Suggested snippet:** Consume `References.MaxOpsBeforeYield` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.MinimumTraceLevel`

- **Source:** `packages/effect/src/References.ts:88`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the minimum trace level threshold for span sampling.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.MinimumTraceLevel`.
- **Suggested snippet:** Consume `References.MinimumTraceLevel` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.PreventSchedulerYield`

- **Source:** `packages/effect/src/References.ts:112`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for whether the runtime bypasses scheduler yield checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.PreventSchedulerYield`.
- **Suggested snippet:** Consume `References.PreventSchedulerYield` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.CurrentStackFrame`

- **Source:** `packages/effect/src/References.ts:321`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the current captured stack-frame chain for the running fiber.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.CurrentStackFrame`.
- **Suggested snippet:** Consume `References.CurrentStackFrame` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.StackFrame`

- **Source:** `packages/effect/src/References.ts:607`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** A captured stack-frame node used to describe the traced execution path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/References.StackFrame`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/References.LogToStderr`

- **Source:** `packages/effect/src/References.ts:649`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for controlling whether built-in console loggers write to stderr.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { References } from "effect"` and use `References.LogToStderr`.
- **Suggested snippet:** Consume `References.LogToStderr` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
