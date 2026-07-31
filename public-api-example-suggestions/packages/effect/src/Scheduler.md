# Example Suggestions: `effect/Scheduler`

- **Package:** `effect`
- **Source:** `packages/effect/src/Scheduler.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 1 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/Scheduler.Scheduler (value)`             |   78 | `root-declaration` | **recommended** |
| `effect/Scheduler.MixedScheduler`                |  151 | `root-declaration` | **optional**    |
| `effect/Scheduler.MaxOpsBeforeYield`             |  268 | `root-declaration` | **optional**    |
| `effect/Scheduler.PreventSchedulerYield`         |  293 | `root-declaration` | **optional**    |
| `effect/Scheduler.Scheduler (type)`              |   32 | `root-declaration` | **optional**    |
| `effect/Scheduler.SchedulerDispatcher`           |   57 | `root-declaration` | **optional**    |
| `effect/Scheduler.MixedScheduler.shouldYield`    |  173 | `member`           | **optional**    |
| `effect/Scheduler.MixedScheduler.makeDispatcher` |  187 | `member`           | **optional**    |

## Recommended

### `effect/Scheduler.Scheduler (value)`

- **Source:** `packages/effect/src/Scheduler.ts:78`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **recommended**
- **Current description:** Context reference for the scheduler used by the Effect runtime.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Scheduler } from "effect"` and use `Scheduler.Scheduler`.
- **Suggested snippet:** Consume `Scheduler.Scheduler` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Scheduler.MixedScheduler`

- **Source:** `packages/effect/src/Scheduler.ts:151`
- **Kind / category:** `root-declaration` / `schedulers`
- **Priority:** **optional**
- **Current description:** Provides a scheduler implementation that batches queued tasks and dispatches them by priority.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Scheduler } from "effect"` and use `Scheduler.MixedScheduler`.
- **Suggested snippet:** Use `Scheduler.MixedScheduler` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Scheduler.MaxOpsBeforeYield`

- **Source:** `packages/effect/src/Scheduler.ts:268`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference that controls the maximum number of operations a fiber can perform before yielding control back to the scheduler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Scheduler } from "effect"` and use `Scheduler.MaxOpsBeforeYield`.
- **Suggested snippet:** Consume `Scheduler.MaxOpsBeforeYield` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Scheduler.PreventSchedulerYield`

- **Source:** `packages/effect/src/Scheduler.ts:293`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference that controls whether the runtime should bypass scheduler yield checks. When set to `true`, the fiber run loop won't call `Scheduler.shouldYield`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Scheduler } from "effect"` and use `Scheduler.PreventSchedulerYield`.
- **Suggested snippet:** Consume `Scheduler.PreventSchedulerYield` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Scheduler.Scheduler (type)`

- **Source:** `packages/effect/src/Scheduler.ts:32`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A scheduler manages the execution of Effect fibers by controlling when queued tasks run.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Scheduler.Scheduler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Scheduler.SchedulerDispatcher`

- **Source:** `packages/effect/src/Scheduler.ts:57`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A dispatcher created by a `Scheduler` for enqueuing tasks and forcing queued tasks to run.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Scheduler.SchedulerDispatcher`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Scheduler.MixedScheduler.shouldYield`

- **Source:** `packages/effect/src/Scheduler.ts:173`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns whether the fiber has reached its operation budget and should yield.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Scheduler.MixedScheduler.shouldYield` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Scheduler.MixedScheduler.makeDispatcher`

- **Source:** `packages/effect/src/Scheduler.ts:187`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a dispatcher that schedules work through this scheduler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Scheduler.MixedScheduler.makeDispatcher` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
