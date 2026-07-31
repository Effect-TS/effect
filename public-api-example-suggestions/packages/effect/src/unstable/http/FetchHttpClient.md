# Example Suggestions: `effect/unstable/http/FetchHttpClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/FetchHttpClient.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/FetchHttpClient.layer`       |  125 | `root-declaration` | **recommended** |
| `effect/unstable/http/FetchHttpClient.RequestInit` |   49 | `root-declaration` | **recommended** |
| `effect/unstable/http/FetchHttpClient.Fetch`       |   30 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/FetchHttpClient.layer`

- **Source:** `packages/effect/src/unstable/http/FetchHttpClient.ts:125`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides an `HttpClient` implementation backed by the configured `Fetch` function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { FetchHttpClient } from "effect/unstable/http"` and use `FetchHttpClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `FetchHttpClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/FetchHttpClient.RequestInit`

- **Source:** `packages/effect/src/unstable/http/FetchHttpClient.ts:49`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that contains default fetch options for the fetch-based HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { FetchHttpClient } from "effect/unstable/http"` and use `FetchHttpClient.RequestInit`.
- **Suggested snippet:** Consume `FetchHttpClient.RequestInit` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/FetchHttpClient.Fetch`

- **Source:** `packages/effect/src/unstable/http/FetchHttpClient.ts:30`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Context reference for the `fetch` implementation used by the fetch-based HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { FetchHttpClient } from "effect/unstable/http"` and use `FetchHttpClient.Fetch`.
- **Suggested snippet:** Consume `FetchHttpClient.Fetch` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
