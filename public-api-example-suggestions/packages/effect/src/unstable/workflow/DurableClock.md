# Example Suggestions: `effect/unstable/workflow/DurableClock`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/DurableClock.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/DurableClock.sleep`        |   70 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableClock.make`         |   42 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableClock.DurableClock` |   28 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/workflow/DurableClock.sleep`

- **Source:** `packages/effect/src/unstable/workflow/DurableClock.ts:70`
- **Kind / category:** `root-declaration` / `sleeping`
- **Priority:** **recommended**
- **Current description:** Waits inside a workflow, using an in-memory activity for durations at or below the threshold and scheduling a durable clock for longer durations.
- **Signature hint:** `declare function sleep(options: { readonly name: string; readonly duration: Duration.Input; readonly inMemoryThreshold?: Duration.Input | undefined; }): Effect.Effect<void, never, WorkflowEngine | WorkflowInstance>`
- **Import guidance:** Start from `import { DurableClock } from "effect/unstable/workflow"` and use `DurableClock.sleep`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableClock.sleep`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/DurableClock.make`

- **Source:** `packages/effect/src/unstable/workflow/DurableClock.ts:42`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a durable clock definition and its associated deferred wake-up signal.
- **Signature hint:** `declare function make(options: { readonly name: string; readonly duration: Duration.Input; }): DurableClock`
- **Import guidance:** Start from `import { DurableClock } from "effect/unstable/workflow"` and use `DurableClock.make`.
- **Suggested snippet:** Construct one representative value with `DurableClock.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/DurableClock.DurableClock`

- **Source:** `packages/effect/src/unstable/workflow/DurableClock.ts:28`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a durable workflow timer with a name, duration, and deferred completed when the timer wakes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/DurableClock.DurableClock`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
