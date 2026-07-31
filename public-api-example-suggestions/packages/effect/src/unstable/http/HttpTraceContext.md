# Example Suggestions: `effect/unstable/http/HttpTraceContext`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 5 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpTraceContext.toHeaders`   |   41 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpTraceContext.fromHeaders` |   63 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpTraceContext.b3`          |   86 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpTraceContext.xb3`         |  112 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpTraceContext.w3c`         |  136 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpTraceContext.FromHeaders` |   26 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/HttpTraceContext.toHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts:41`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Encodes a span into HTTP trace propagation headers.
- **Signature hint:** `declare function toHeaders(span: Tracer.Span): Headers.Headers`
- **Import guidance:** Start from `import { HttpTraceContext } from "effect/unstable/http"` and use `HttpTraceContext.toHeaders`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpTraceContext.toHeaders`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpTraceContext.fromHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts:63`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes an external span safely from HTTP trace propagation headers.
- **Signature hint:** `declare function fromHeaders(headers: Headers.Headers): Option.Option<Tracer.ExternalSpan>`
- **Import guidance:** Start from `import { HttpTraceContext } from "effect/unstable/http"` and use `HttpTraceContext.fromHeaders`.
- **Suggested snippet:** Call `HttpTraceContext.fromHeaders` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpTraceContext.b3`

- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts:86`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes an external span safely from the compact B3 `b3` header.
- **Signature hint:** `declare function b3(headers: Headers.Headers): Option.Option<Tracer.ExternalSpan>`
- **Import guidance:** Start from `import { HttpTraceContext } from "effect/unstable/http"` and use `HttpTraceContext.b3`.
- **Suggested snippet:** Call `HttpTraceContext.b3` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpTraceContext.xb3`

- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts:112`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes an external span safely from multi-header B3 propagation headers.
- **Signature hint:** `declare function xb3(headers: Headers.Headers): Option.Option<Tracer.ExternalSpan>`
- **Import guidance:** Start from `import { HttpTraceContext } from "effect/unstable/http"` and use `HttpTraceContext.xb3`.
- **Suggested snippet:** Call `HttpTraceContext.xb3` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpTraceContext.w3c`

- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts:136`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes an external span safely from the W3C `traceparent` header.
- **Signature hint:** `declare function w3c(headers: Headers.Headers): Option.Option<Tracer.ExternalSpan>`
- **Import guidance:** Start from `import { HttpTraceContext } from "effect/unstable/http"` and use `HttpTraceContext.w3c`.
- **Suggested snippet:** Call `HttpTraceContext.w3c` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpTraceContext.FromHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpTraceContext.ts:26`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Function type for decoding tracing headers into an external span.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpTraceContext.FromHeaders`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
