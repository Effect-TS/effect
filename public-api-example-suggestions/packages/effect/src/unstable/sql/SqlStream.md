# Example Suggestions: `effect/unstable/sql/SqlStream`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlStream.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/sql/SqlStream.asyncPauseResume` |   27 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/sql/SqlStream.asyncPauseResume`

- **Source:** `packages/effect/src/unstable/sql/SqlStream.ts:27`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a stream from a callback-style producer with pause and resume callbacks that are triggered when the internal queue applies backpressure.
- **Signature hint:** `declare function asyncPauseResume<A, E = never, R = never>(register: (emit: { readonly single: (item: A) => void; readonly array: (arr: ReadonlyArray<A>) => void; readonly fail: (error: E) => void; readonly end: () => void; }) => Effect.Effect<{ onPause(): void; onResume(): void; }, E, R | Scope.Scope>, bufferSize?: number): Stream.Stream<A, E, R>`
- **Import guidance:** Start from `import { SqlStream } from "effect/unstable/sql"` and use `SqlStream.asyncPauseResume`.
- **Suggested snippet:** Create a finite stream, apply `SqlStream.asyncPauseResume`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
