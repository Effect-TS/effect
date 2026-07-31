# Example Suggestions: `@effect/platform-bun/BunMultipart`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunMultipart.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority        |
| --------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunMultipart.persisted` |   45 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunMultipart.stream`    |   25 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunMultipart.persisted`

- **Source:** `packages/platform-bun/src/BunMultipart.ts:45`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Parses and persists multipart data from a Bun `Request`, requiring file-system, path, and scope services.
- **Signature hint:** `declare function persisted(source: Request): Effect.Effect<Multipart.Persisted, Multipart.MultipartError, FileSystem | Path | Scope.Scope>`
- **Import guidance:** Start from `import { BunMultipart } from "@effect/platform-bun"` and use `BunMultipart.persisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `BunMultipart.persisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunMultipart.stream`

- **Source:** `packages/platform-bun/src/BunMultipart.ts:25`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Parses a Bun `Request` body as multipart data and returns a stream of multipart parts.
- **Signature hint:** `declare function stream(source: Request): Stream.Stream<Multipart.Part, Multipart.MultipartError>`
- **Import guidance:** Start from `import { BunMultipart } from "@effect/platform-bun"` and use `BunMultipart.stream`.
- **Suggested snippet:** Create a finite stream, apply `BunMultipart.stream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
