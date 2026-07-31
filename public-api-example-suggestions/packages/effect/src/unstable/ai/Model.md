# Example Suggestions: `effect/unstable/ai/Model`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Model.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/Model.ProviderName`              |   66 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Model.ModelName`                 |   82 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Model.Model`                     |   34 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Model.Model.provider`            |   42 | `member`           | **optional**    |
| `effect/unstable/ai/Model.Model.captureRequirements` |   47 | `member`           | **optional**    |

## Recommended

### `effect/unstable/ai/Model.ProviderName`

- **Source:** `packages/effect/src/unstable/ai/Model.ts:66`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag that provides the current large language model provider name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/ai"` and use `Model.ProviderName`.
- **Suggested snippet:** Consume `Model.ProviderName` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Model.ModelName`

- **Source:** `packages/effect/src/unstable/ai/Model.ts:82`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag that provides the current large language model name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/ai"` and use `Model.ModelName`.
- **Suggested snippet:** Consume `Model.ModelName` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/Model.Model`

- **Source:** `packages/effect/src/unstable/ai/Model.ts:34`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A Model represents a provider-specific AI service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Model.Model`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Model.Model.provider`

- **Source:** `packages/effect/src/unstable/ai/Model.ts:42`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The provider identifier (e.g., "openai", "anthropic", "amazon-bedrock").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Model.Model.provider` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Model.Model.captureRequirements`

- **Source:** `packages/effect/src/unstable/ai/Model.ts:47`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a `Layer` with the requirements satisfied, using the current context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Model.Model.captureRequirements` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
