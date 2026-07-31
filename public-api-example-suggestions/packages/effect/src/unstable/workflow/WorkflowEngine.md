# Example Suggestions: `effect/unstable/workflow/WorkflowEngine`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/WorkflowEngine.ts`
- **Uncovered API records:** 5
- **Priorities:** 1 required, 2 recommended, 1 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/WorkflowEngine.WorkflowEngine`   |   37 | `root-declaration` | **required**    |
| `effect/unstable/workflow/WorkflowEngine.layerMemory`      |  576 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/WorkflowEngine.WorkflowInstance` |  228 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/WorkflowEngine.Encoded`          |  296 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/WorkflowEngine.makeUnsafe`       |  377 | `root-declaration` | **discouraged** |

## Required

### `effect/unstable/workflow/WorkflowEngine.WorkflowEngine`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowEngine.ts:37`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **required**
- **Current description:** Service that represents workflow runtimes, responsible for registering and executing workflows and coordinating activities, durable deferreds, interrupts, resumes, and clocks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkflowEngine } from "effect/unstable/workflow"` and use `WorkflowEngine.WorkflowEngine`.
- **Suggested snippet:** Consume `WorkflowEngine.WorkflowEngine` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/workflow/WorkflowEngine.layerMemory`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowEngine.ts:576`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides an in-memory `WorkflowEngine`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkflowEngine } from "effect/unstable/workflow"` and use `WorkflowEngine.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `WorkflowEngine.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/WorkflowEngine.WorkflowInstance`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowEngine.ts:228`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that contains workflow runtime state for one execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkflowEngine } from "effect/unstable/workflow"` and use `WorkflowEngine.WorkflowInstance`.
- **Suggested snippet:** Consume `WorkflowEngine.WorkflowInstance` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/WorkflowEngine.Encoded`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowEngine.ts:296`
- **Kind / category:** `root-declaration` / `Encoded`
- **Priority:** **optional**
- **Current description:** Low-level workflow engine contract that works with encoded payloads and results before `makeUnsafe` adds typed schema decoding and encoding.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/WorkflowEngine.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workflow/WorkflowEngine.makeUnsafe`

- **Source:** `packages/effect/src/unstable/workflow/WorkflowEngine.ts:377`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Builds a typed `WorkflowEngine` service from a low-level encoded implementation.
- **Signature hint:** `declare function makeUnsafe(options: Encoded): WorkflowEngine['Service']`
- **Import guidance:** Start from `import { WorkflowEngine } from "effect/unstable/workflow"` and use `WorkflowEngine.makeUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `WorkflowEngine.makeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
