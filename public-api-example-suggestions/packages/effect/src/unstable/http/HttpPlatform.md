# Example Suggestions: `effect/unstable/http/HttpPlatform`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpPlatform.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpPlatform.HttpPlatform` |   31 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpPlatform.make`         |   57 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpPlatform.layer`        |  146 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/http/HttpPlatform.HttpPlatform`

- **Source:** `packages/effect/src/unstable/http/HttpPlatform.ts:31`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for platform-specific HTTP response helpers, including file-backed server responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpPlatform } from "effect/unstable/http"` and use `HttpPlatform.HttpPlatform`.
- **Suggested snippet:** Consume `HttpPlatform.HttpPlatform` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpPlatform.make`

- **Source:** `packages/effect/src/unstable/http/HttpPlatform.ts:57`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `HttpPlatform` service from platform-specific file response constructors, using `FileSystem` and `Etag.Generator`.
- **Signature hint:** `declare function make(impl: { readonly platform: 'deno' | 'node' | 'bun' | 'web'; readonly fileResponse: (path: string, status: number, statusText: string | undefined, headers: Headers.Headers, start: number, end: number | undefined, contentLength: number) => Response.HttpServerResponse; readonly fileWebResponse: (file: Body.HttpBody.FileLike, status: number, statusText: string | undefined, headers: Headers.Headers, options?: { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; }) => Response.HttpServerResponse; }): Effect.Effect<HttpPlatform['Service'], never, Etag.Generator | FileSystem.FileSystem>`
- **Import guidance:** Start from `import { HttpPlatform } from "effect/unstable/http"` and use `HttpPlatform.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpPlatform.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpPlatform.layer`

- **Source:** `packages/effect/src/unstable/http/HttpPlatform.ts:146`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the default `HttpPlatform` implementation for serving file paths and `File`-like values as streamed HTTP responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpPlatform } from "effect/unstable/http"` and use `HttpPlatform.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpPlatform.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
