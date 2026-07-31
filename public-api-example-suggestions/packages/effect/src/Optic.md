# Example Suggestions: `effect/Optic`

- **Package:** `effect`
- **Source:** `packages/effect/src/Optic.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind     | Priority     |
| ------------------------------------- | ---: | -------- | ------------ |
| `effect/Optic.Optional.getResult`     |  446 | `member` | **optional** |
| `effect/Optic.Optional.replace`       |  451 | `member` | **optional** |
| `effect/Optic.Optional.replaceResult` |  456 | `member` | **optional** |

## Optional

### `effect/Optic.Optional.getResult`

- **Source:** `packages/effect/src/Optic.ts:446`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Attempts to read the focus `A` from the whole `S`. Returns `Result.Success<A>` when the focus exists, or `Result.Failure<string>` with a descriptive error otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Optic.Optional.getResult` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Optic.Optional.replace`

- **Source:** `packages/effect/src/Optic.ts:451`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Replaces the focus in `S` with a new `A`. Returns the original `s` unchanged when the optic cannot focus (never throws).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Optic.Optional.replace` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Optic.Optional.replaceResult`

- **Source:** `packages/effect/src/Optic.ts:456`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Like `replace`, but returns an explicit `Result` so callers can detect and handle failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Optic.Optional.replaceResult` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
