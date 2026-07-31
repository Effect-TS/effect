# Example Suggestions: `effect/Take`

- **Package:** `effect`
- **Source:** `packages/effect/src/Take.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                  | Line | Kind               | Priority        |
| -------------------- | ---: | ------------------ | --------------- |
| `effect/Take.toPull` |   43 | `root-declaration` | **recommended** |
| `effect/Take.Take`   |   29 | `root-declaration` | **optional**    |

## Recommended

### `effect/Take.toPull`

- **Source:** `packages/effect/src/Take.ts:43`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts a `Take` into a `Pull`, succeeding with value batches, failing with failure exits, and translating successful exits into pull completion.
- **Signature hint:** `declare function toPull<A, E, Done>(take: Take<A, E, Done>): Pull.Pull<NonEmptyReadonlyArray<A>, E, Done>`
- **Import guidance:** Start from `import { Take } from "effect"` and use `Take.toPull`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Take.toPull`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Take.Take`

- **Source:** `packages/effect/src/Take.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents one pull result: either a non-empty batch of values, a failure `Exit`, or a successful `Exit` that signals completion with a `Done` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Take.Take`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
