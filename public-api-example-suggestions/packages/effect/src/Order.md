# Example Suggestions: `effect/Order`

- **Package:** `effect`
- **Source:** `packages/effect/src/Order.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                            | Line | Kind               | Priority     |
| ------------------------------ | ---: | ------------------ | ------------ |
| `effect/Order.OrderTypeLambda` |   72 | `root-declaration` | **optional** |

## Optional

### `effect/Order.OrderTypeLambda`

- **Source:** `packages/effect/src/Order.ts:72`
- **Kind / category:** `root-declaration` / `type lambdas`
- **Priority:** **optional**
- **Current description:** Type lambda for the `Order` type class, used internally for higher-kinded type operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Order.OrderTypeLambda`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
