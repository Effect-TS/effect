# Example Suggestions: `@effect/ai-openrouter/OpenRouterConfig`

- **Package:** `@effect/ai-openrouter`
- **Source:** `packages/ai/openrouter/src/OpenRouterConfig.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind                    | Priority        |
| ------------------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig (value)`        |   28 | `root-declaration`      | **recommended** |
| `@effect/ai-openrouter/OpenRouterConfig.withClientTransform`             |   86 | `root-declaration`      | **recommended** |
| `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig.getOrUndefined` |   37 | `member`                | **optional**    |
| `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig (type)`         |   48 | `namespace`             | **optional**    |
| `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig.Service`        |   56 | `namespace-declaration` | **optional**    |

## Recommended

### `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig (value)`

- **Source:** `packages/ai/openrouter/src/OpenRouterConfig.ts:28`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for scoped OpenRouter provider configuration used by client operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenRouterConfig } from "@effect/ai-openrouter"` and use `OpenRouterConfig.OpenRouterConfig`.
- **Suggested snippet:** Consume `OpenRouterConfig.OpenRouterConfig` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterConfig.withClientTransform`

- **Source:** `packages/ai/openrouter/src/OpenRouterConfig.ts:86`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Provides a scoped transform for the OpenRouter HTTP client used by provider operations.
- **Signature hint:** `declare function withClientTransform(transform: (client: HttpClient) => HttpClient): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withClientTransform<A, E, R>(self: Effect.Effect<A, E, R>, transform: (client: HttpClient) => HttpClient): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { OpenRouterConfig } from "@effect/ai-openrouter"` and use `OpenRouterConfig.withClientTransform`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenRouterConfig.withClientTransform`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig.getOrUndefined`

- **Source:** `packages/ai/openrouter/src/OpenRouterConfig.ts:37`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Gets the configured OpenRouter service from the current context when present.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig.getOrUndefined` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig (type)`

- **Source:** `packages/ai/openrouter/src/OpenRouterConfig.ts:48`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types associated with the `OpenRouterConfig` context service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig.Service`

- **Source:** `packages/ai/openrouter/src/OpenRouterConfig.ts:56`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration values read by OpenRouter provider operations when resolving the generated HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterConfig.OpenRouterConfig.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
