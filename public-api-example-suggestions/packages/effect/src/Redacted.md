# Example Suggestions: `effect/Redacted`

- **Package:** `effect`
- **Source:** `packages/effect/src/Redacted.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind                    | Priority        |
| ----------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Redacted.Redacted.Variance` |   98 | `namespace-declaration` | **discouraged** |

## Discouraged

### `effect/Redacted.Redacted.Variance`

- **Source:** `packages/effect/src/Redacted.ts:98`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Redacted`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Redacted.Redacted.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
