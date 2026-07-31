# Example Suggestions: `@effect/platform-node/NodeMultipart`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeMultipart.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeMultipart.persisted`      |   61 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeMultipart.stream`         |   35 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeMultipart.fileToReadable` |   82 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node/NodeMultipart.persisted`

- **Source:** `packages/platform-node/src/NodeMultipart.ts:61`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Parses multipart data from a Node readable request body and persists file parts using the current `FileSystem`, `Path`, and `Scope` services.
- **Signature hint:** `declare function persisted(source: Readable, headers: IncomingHttpHeaders): Effect.Effect<Multipart.Persisted, Multipart.MultipartError, Scope.Scope | FileSystem.FileSystem | Path.Path>`
- **Import guidance:** Start from `import { NodeMultipart } from "@effect/platform-node"` and use `NodeMultipart.persisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeMultipart.persisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeMultipart.stream`

- **Source:** `packages/platform-node/src/NodeMultipart.ts:35`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Parses multipart data from a Node readable request body and headers into a stream of `Multipart.Part` values, converting parser failures to `MultipartError`.
- **Signature hint:** `declare function stream(source: Readable, headers: IncomingHttpHeaders): Stream.Stream<Multipart.Part, Multipart.MultipartError>`
- **Import guidance:** Start from `import { NodeMultipart } from "@effect/platform-node"` and use `NodeMultipart.stream`.
- **Suggested snippet:** Create a finite stream, apply `NodeMultipart.stream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeMultipart.fileToReadable`

- **Source:** `packages/platform-node/src/NodeMultipart.ts:82`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Returns the underlying Node readable stream for a multipart file produced by the Node multipart parser.
- **Signature hint:** `declare function fileToReadable(file: Multipart.File): Readable`
- **Import guidance:** Start from `import { NodeMultipart } from "@effect/platform-node"` and use `NodeMultipart.fileToReadable`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the underlying Node readable stream for a multipart file produced by the Node multipart parser. Call `NodeMultipart.fileToReadable` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
