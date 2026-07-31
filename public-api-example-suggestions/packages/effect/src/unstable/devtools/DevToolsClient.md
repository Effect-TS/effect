# Example Suggestions: `effect/unstable/devtools/DevToolsClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/devtools/DevToolsClient.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 3 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/devtools/DevToolsClient.layer`          |  178 | `root-declaration` | **recommended** |
| `effect/unstable/devtools/DevToolsClient.layerTracer`    |  234 | `root-declaration` | **recommended** |
| `effect/unstable/devtools/DevToolsClient.DevToolsClient` |   37 | `root-declaration` | **recommended** |
| `effect/unstable/devtools/DevToolsClient.make`           |  141 | `root-declaration` | **optional**    |
| `effect/unstable/devtools/DevToolsClient.makeTracer`     |  220 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/devtools/DevToolsClient.layer`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsClient.ts:178`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `DevToolsClient` using the current `Socket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsClient } from "effect/unstable/devtools"` and use `DevToolsClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DevToolsClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/devtools/DevToolsClient.layerTracer`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsClient.ts:234`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that creates a `DevToolsClient` from the current `Socket` and installs the devtools tracer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsClient } from "effect/unstable/devtools"` and use `DevToolsClient.layerTracer`.
- **Suggested snippet:** Use the public setup or registry consumed by `DevToolsClient.layerTracer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/devtools/DevToolsClient.DevToolsClient`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsClient.ts:37`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for sending span and span-event telemetry to the Effect devtools connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsClient } from "effect/unstable/devtools"` and use `DevToolsClient.DevToolsClient`.
- **Suggested snippet:** Consume `DevToolsClient.DevToolsClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/devtools/DevToolsClient.make`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsClient.ts:141`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a devtools client over the current `Socket`, speaking the devtools NDJSON protocol, sending periodic pings, and responding to metrics snapshot requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsClient } from "effect/unstable/devtools"` and use `DevToolsClient.make`.
- **Suggested snippet:** Construct one representative value with `DevToolsClient.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsClient.makeTracer`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsClient.ts:220`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a tracer that delegates to the current tracer while sending span starts, span events, and span ends to `DevToolsClient`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsClient } from "effect/unstable/devtools"` and use `DevToolsClient.makeTracer`.
- **Suggested snippet:** Construct one representative value with `DevToolsClient.makeTracer`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
