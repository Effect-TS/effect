# Example Suggestions: `effect/unstable/ai/ResponseIdTracker`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/ResponseIdTracker.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 2 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/ResponseIdTracker.ResponseIdTracker` |   67 | `root-declaration` | **recommended** |
| `effect/unstable/ai/ResponseIdTracker.make`              |   82 | `root-declaration` | **recommended** |
| `effect/unstable/ai/ResponseIdTracker.PrepareResult`     |   29 | `root-declaration` | **optional**    |
| `effect/unstable/ai/ResponseIdTracker.Service`           |   48 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/ai/ResponseIdTracker.ResponseIdTracker`

- **Source:** `packages/effect/src/unstable/ai/ResponseIdTracker.ts:67`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for enabling provider previous-response ID reuse across language model calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ResponseIdTracker } from "effect/unstable/ai"` and use `ResponseIdTracker.ResponseIdTracker`.
- **Suggested snippet:** Consume `ResponseIdTracker.ResponseIdTracker` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/ResponseIdTracker.make`

- **Source:** `packages/effect/src/unstable/ai/ResponseIdTracker.ts:82`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an in-memory `ResponseIdTracker` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ResponseIdTracker } from "effect/unstable/ai"` and use `ResponseIdTracker.make`.
- **Suggested snippet:** Construct one representative value with `ResponseIdTracker.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/ResponseIdTracker.PrepareResult`

- **Source:** `packages/effect/src/unstable/ai/ResponseIdTracker.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Result returned when a tracked prompt can be sent incrementally.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/ResponseIdTracker.PrepareResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/ResponseIdTracker.Service`

- **Source:** `packages/effect/src/unstable/ai/ResponseIdTracker.ts:48`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mutable service that tracks prompt message object identities by provider response ID.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/ResponseIdTracker.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
