# Example Suggestions: `@effect/platform-bun/BunStream`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunStream.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunStream.fromReadableStream` |   33 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunStream.fromReadableStream`

- **Source:** `packages/platform-bun/src/BunStream.ts:33`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a stream from a `ReadableStream` using Bun's optimized `.readMany` API.
- **Signature hint:** `declare function fromReadableStream<A, E>(options: { readonly evaluate: LazyArg<ReadableStream<A>>; readonly onError: (error: unknown) => E; readonly releaseLockOnEnd?: boolean | undefined; }): Stream.Stream<A, E>`
- **Import guidance:** Start from `import { BunStream } from "@effect/platform-bun"` and use `BunStream.fromReadableStream`.
- **Suggested snippet:** Create a finite stream, apply `BunStream.fromReadableStream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
