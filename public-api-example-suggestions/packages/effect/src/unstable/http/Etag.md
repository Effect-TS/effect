# Example Suggestions: `effect/unstable/http/Etag`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/Etag.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 2 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind               | Priority        |
| ------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/Etag.layer`     |  115 | `root-declaration` | **recommended** |
| `effect/unstable/http/Etag.layerWeak` |  132 | `root-declaration` | **recommended** |
| `effect/unstable/http/Etag.toString`  |   62 | `root-declaration` | **optional**    |
| `effect/unstable/http/Etag.Etag`      |   24 | `root-declaration` | **optional**    |
| `effect/unstable/http/Etag.Weak`      |   36 | `root-declaration` | **optional**    |
| `effect/unstable/http/Etag.Strong`    |   51 | `root-declaration` | **optional**    |
| `effect/unstable/http/Etag.Generator` |   77 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/Etag.layer`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:115`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a `Generator` which produces strong ETags from file size and modification time metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Etag } from "effect/unstable/http"` and use `Etag.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Etag.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Etag.layerWeak`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:132`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a `Generator` which produces weak ETags from file size and modification time metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Etag } from "effect/unstable/http"` and use `Etag.layerWeak`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Etag.layerWeak`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/Etag.toString`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:62`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Formats an `Etag` as an HTTP header value, including quotes and the `W/` prefix for weak tags.
- **Signature hint:** `declare function toString(self: Etag): string`
- **Import guidance:** Start from `import { Etag } from "effect/unstable/http"` and use `Etag.toString`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Etag.toString`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Etag.Etag`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:24`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an HTTP entity tag, either weak or strong.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Etag.Etag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Etag.Weak`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:36`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Weak HTTP entity tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Etag.Weak`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Etag.Strong`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:51`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Strong HTTP entity tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Etag.Strong`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Etag.Generator`

- **Source:** `packages/effect/src/unstable/http/Etag.ts:77`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service for generating ETags from filesystem file information or Web `File`-like metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Etag } from "effect/unstable/http"` and use `Etag.Generator`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Etag.Generator`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
