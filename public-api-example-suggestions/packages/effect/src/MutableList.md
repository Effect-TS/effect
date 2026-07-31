# Example Suggestions: `effect/MutableList`

- **Package:** `effect`
- **Source:** `packages/effect/src/MutableList.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                            | Line | Kind               | Priority     |
| ------------------------------ | ---: | ------------------ | ------------ |
| `effect/MutableList.takeNVoid` |  666 | `root-declaration` | **optional** |
| `effect/MutableList.toArrayN`  |  812 | `root-declaration` | **optional** |
| `effect/MutableList.toArray`   |  841 | `root-declaration` | **optional** |

## Optional

### `effect/MutableList.takeNVoid`

- **Source:** `packages/effect/src/MutableList.ts:666`
- **Kind / category:** `root-declaration` / `elements`
- **Priority:** **optional**
- **Current description:** Removes up to `n` elements from the beginning of the `MutableList` without returning them.
- **Signature hint:** `declare function takeNVoid<A>(self: MutableList<A>, n: number): void`
- **Import guidance:** Start from `import { MutableList } from "effect"` and use `MutableList.takeNVoid`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Removes up to `n` elements from the beginning of the `MutableList` without returning them. Call `MutableList.takeNVoid` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/MutableList.toArrayN`

- **Source:** `packages/effect/src/MutableList.ts:812`
- **Kind / category:** `root-declaration` / `elements`
- **Priority:** **optional**
- **Current description:** Copies up to `n` elements from the beginning of the `MutableList` into a new array without modifying the list.
- **Signature hint:** `declare function toArrayN<A>(self: MutableList<A>, n: number): Array<A>`
- **Import guidance:** Start from `import { MutableList } from "effect"` and use `MutableList.toArrayN`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `MutableList.toArrayN`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/MutableList.toArray`

- **Source:** `packages/effect/src/MutableList.ts:841`
- **Kind / category:** `root-declaration` / `elements`
- **Priority:** **optional**
- **Current description:** Copies all current elements of the `MutableList` into a new array without modifying the list.
- **Signature hint:** `declare function toArray<A>(self: MutableList<A>): Array<A>`
- **Import guidance:** Start from `import { MutableList } from "effect"` and use `MutableList.toArray`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `MutableList.toArray`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
