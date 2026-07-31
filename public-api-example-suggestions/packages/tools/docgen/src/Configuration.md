# Example Suggestions: `@effect/docgen/Configuration`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/Configuration.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 2 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/docgen/Configuration.ConfigurationSchema` |   45 | `root-declaration` | **recommended** |
| `@effect/docgen/Configuration.Configuration`       |  138 | `root-declaration` | **recommended** |
| `@effect/docgen/Configuration.DEFAULT_THEME`       |   29 | `root-declaration` | **optional**    |
| `@effect/docgen/Configuration.ConfigurationShape`  |  114 | `root-declaration` | **optional**    |

## Recommended

### `@effect/docgen/Configuration.ConfigurationSchema`

- **Source:** `packages/tools/docgen/src/Configuration.ts:45`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for docgen configuration files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Configuration } from "@effect/docgen"` and use `Configuration.ConfigurationSchema`.
- **Suggested snippet:** Use `Configuration.ConfigurationSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Configuration.Configuration`

- **Source:** `packages/tools/docgen/src/Configuration.ts:138`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that provides resolved docgen configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Configuration } from "@effect/docgen"` and use `Configuration.Configuration`.
- **Suggested snippet:** Use `Configuration.Configuration` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/docgen/Configuration.DEFAULT_THEME`

- **Source:** `packages/tools/docgen/src/Configuration.ts:29`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Default GitHub Pages theme written to generated configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Configuration } from "@effect/docgen"` and use `Configuration.DEFAULT_THEME`.
- **Suggested snippet:** Use `Configuration.DEFAULT_THEME` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Configuration.ConfigurationShape`

- **Source:** `packages/tools/docgen/src/Configuration.ts:114`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Resolved configuration used by the docgen services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/docgen/Configuration.ConfigurationShape`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
