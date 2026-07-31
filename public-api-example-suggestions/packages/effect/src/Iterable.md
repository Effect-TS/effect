# Example Suggestions: `effect/Iterable`

- **Package:** `effect`
- **Source:** `packages/effect/src/Iterable.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                       | Line | Kind               | Priority     |
| ------------------------- | ---: | ------------------ | ------------ |
| `effect/Iterable.repeat`  |  144 | `root-declaration` | **optional** |
| `effect/Iterable.forever` |  168 | `root-declaration` | **optional** |

## Optional

### `effect/Iterable.repeat`

- **Source:** `packages/effect/src/Iterable.ts:144`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Repeats an iterable `n` times, yielding the full contents of `self` for each repetition.
- **Signature hint:** `declare function repeat(n: number): <A>(self: Iterable<A>) => Iterable<A> declare function repeat<A>(self: Iterable<A>, n: number): Iterable<A>`
- **Import guidance:** Start from `import { Iterable } from "effect"` and use `Iterable.repeat`.
- **Suggested snippet:** Apply `Iterable.repeat` to a small finite iterable and materialize the result with `Array.from`. Assert the resulting values, bounding the input first if the API can produce unbounded output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Iterable.forever`

- **Source:** `packages/effect/src/Iterable.ts:168`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Repeats an iterable without an upper bound.
- **Signature hint:** `declare function forever<A>(self: Iterable<A>): Iterable<A>`
- **Import guidance:** Start from `import { Iterable } from "effect"` and use `Iterable.forever`.
- **Suggested snippet:** Apply `Iterable.forever` to a small finite iterable and materialize the result with `Array.from`. Assert the resulting values, bounding the input first if the API can produce unbounded output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
