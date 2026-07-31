# Example Suggestions: `@effect/platform-browser/BrowserHttpClient`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 5 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserHttpClient.layerFetch`             |   52 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserHttpClient.layerXMLHttpRequest`    |  428 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserHttpClient.RequestInit`            |   64 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserHttpClient.withXHRArrayBuffer`     |  104 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserHttpClient.XMLHttpRequest`         |  119 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserHttpClient.Fetch`                  |   45 | `root-declaration` | **optional**    |
| `@effect/platform-browser/BrowserHttpClient.CurrentXHRResponseType` |   93 | `root-declaration` | **optional**    |
| `@effect/platform-browser/BrowserHttpClient.XHRResponseType`        |   77 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-browser/BrowserHttpClient.layerFetch`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:52`
- **Kind / category:** `root-declaration` / `fetch`
- **Priority:** **recommended**
- **Current description:** Layer that provides an `HttpClient` implementation backed by the configured `Fetch` function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.layerFetch`.
- **Suggested snippet:** Use `BrowserHttpClient.layerFetch` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserHttpClient.layerXMLHttpRequest`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:428`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides an `HttpClient` implementation backed by the browser `XMLHttpRequest` API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.layerXMLHttpRequest`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserHttpClient.layerXMLHttpRequest`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserHttpClient.RequestInit`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:64`
- **Kind / category:** `root-declaration` / `fetch`
- **Priority:** **recommended**
- **Current description:** Service that contains default fetch options for the browser fetch client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.RequestInit`.
- **Suggested snippet:** Use `BrowserHttpClient.RequestInit` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserHttpClient.withXHRArrayBuffer`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:104`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **recommended**
- **Current description:** Runs an effect with `CurrentXHRResponseType` set to `"arraybuffer"` so the XHR HTTP client receives response bodies as `ArrayBuffer` values.
- **Signature hint:** `declare function withXHRArrayBuffer<A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.withXHRArrayBuffer`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `BrowserHttpClient.withXHRArrayBuffer`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserHttpClient.XMLHttpRequest`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:119`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the `XMLHttpRequest` constructor used by the browser XHR HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.XMLHttpRequest`.
- **Suggested snippet:** Consume `BrowserHttpClient.XMLHttpRequest` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/BrowserHttpClient.Fetch`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:45`
- **Kind / category:** `root-declaration` / `fetch`
- **Priority:** **optional**
- **Current description:** Context reference for the `fetch` implementation used by the fetch-based HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.Fetch`.
- **Suggested snippet:** Consume `BrowserHttpClient.Fetch` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/BrowserHttpClient.CurrentXHRResponseType`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:93`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the `XMLHttpRequest.responseType` used by the browser XHR HTTP client, defaulting to `"text"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserHttpClient } from "@effect/platform-browser"` and use `BrowserHttpClient.CurrentXHRResponseType`.
- **Suggested snippet:** Consume `BrowserHttpClient.CurrentXHRResponseType` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/BrowserHttpClient.XHRResponseType`

- **Source:** `packages/platform-browser/src/BrowserHttpClient.ts:77`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Allowed response body modes for the browser XHR HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/BrowserHttpClient.XHRResponseType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
