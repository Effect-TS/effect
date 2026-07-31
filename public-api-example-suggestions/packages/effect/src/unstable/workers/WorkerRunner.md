# Example Suggestions: `effect/unstable/workers/WorkerRunner`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workers/WorkerRunner.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority     |
| ----------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/workers/WorkerRunner.WorkerRunner`         |   23 | `root-declaration` | **optional** |
| `effect/unstable/workers/WorkerRunner.PlatformMessage`      |   47 | `root-declaration` | **optional** |
| `effect/unstable/workers/WorkerRunner.WorkerRunnerPlatform` |   55 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/workers/WorkerRunner.WorkerRunner`

- **Source:** `packages/effect/src/unstable/workers/WorkerRunner.ts:23`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Platform-neutral worker runner that receives inbound messages by port ID, sends outbound messages, and optionally exposes disconnect notifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/WorkerRunner.WorkerRunner`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerRunner.PlatformMessage`

- **Source:** `packages/effect/src/unstable/workers/WorkerRunner.ts:47`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Wire protocol message used by worker platforms: a request carrying input or a close signal.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/WorkerRunner.PlatformMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerRunner.WorkerRunnerPlatform`

- **Source:** `packages/effect/src/unstable/workers/WorkerRunner.ts:55`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context service that starts a platform-specific `WorkerRunner`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerRunner } from "effect/unstable/workers"` and use `WorkerRunner.WorkerRunnerPlatform`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerRunner.WorkerRunnerPlatform`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
