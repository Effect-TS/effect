# Example Suggestions: `@effect/platform-deno/DenoMultipart`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoMultipart.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoMultipart.persisted` |   45 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoMultipart.stream`    |   25 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoMultipart.persisted`

- **Source:** `packages/platform-deno/src/DenoMultipart.ts:45`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Parses and persists multipart data from a web `Request`, requiring file-system, path, and scope services.
- **Signature hint:** `declare function persisted(source: Request): Effect.Effect<Multipart.Persisted, Multipart.MultipartError, FileSystem | Path | Scope.Scope>`
- **Import guidance:** Start from `import { DenoMultipart } from "@effect/platform-deno"` and use `DenoMultipart.persisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoMultipart.persisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoMultipart.stream`

- **Source:** `packages/platform-deno/src/DenoMultipart.ts:25`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Parses a web `Request` body as multipart data and returns a stream of multipart parts.
- **Signature hint:** `declare function stream(source: Request): Stream.Stream<Multipart.Part, Multipart.MultipartError>`
- **Import guidance:** Start from `import { DenoMultipart } from "@effect/platform-deno"` and use `DenoMultipart.stream`.
- **Suggested snippet:** Create a finite stream, apply `DenoMultipart.stream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
