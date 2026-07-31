# Example Suggestions: `effect/unstable/cli/Primitive`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/Primitive.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind                    | Priority        |
| -------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cli/Primitive.FileSchemaOptions`  |  747 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Primitive.FileParseOptions`   |  660 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Primitive.Primitive`          |   81 | `namespace`             | **optional**    |
| `effect/unstable/cli/Primitive.Primitive.Variance` |   88 | `namespace-declaration` | **discouraged** |

## Optional

### `effect/unstable/cli/Primitive.FileSchemaOptions`

- **Source:** `packages/effect/src/unstable/cli/Primitive.ts:747`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents options which can be provided to methods that deal with parsing file content and decoding the file content with a `Schema`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Primitive.FileSchemaOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Primitive.FileParseOptions`

- **Source:** `packages/effect/src/unstable/cli/Primitive.ts:660`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents options which can be provided to methods that deal with parsing file content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Primitive.FileParseOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Primitive.Primitive`

- **Source:** `packages/effect/src/unstable/cli/Primitive.ts:81`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers for `Primitive`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Primitive.Primitive`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cli/Primitive.Primitive.Variance`

- **Source:** `packages/effect/src/unstable/cli/Primitive.ts:88`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for the value parsed by a `Primitive`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/Primitive.Primitive.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
