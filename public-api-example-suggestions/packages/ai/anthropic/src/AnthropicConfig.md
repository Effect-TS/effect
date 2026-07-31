# Example Suggestions: `@effect/ai-anthropic/AnthropicConfig`

- **Package:** `@effect/ai-anthropic`
- **Source:** `packages/ai/anthropic/src/AnthropicConfig.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                   | Line | Kind                    | Priority        |
| --------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig (value)`        |   27 | `root-declaration`      | **recommended** |
| `@effect/ai-anthropic/AnthropicConfig.withClientTransform`            |   74 | `root-declaration`      | **recommended** |
| `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig.getOrUndefined` |   36 | `member`                | **optional**    |
| `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig (type)`         |   47 | `namespace`             | **optional**    |
| `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig.Service`        |   58 | `namespace-declaration` | **optional**    |

## Recommended

### `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicConfig.ts:27`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for Anthropic client configuration overrides, such as transformations applied to the generated HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicConfig } from "@effect/ai-anthropic"` and use `AnthropicConfig.AnthropicConfig`.
- **Suggested snippet:** Consume `AnthropicConfig.AnthropicConfig` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicConfig.withClientTransform`

- **Source:** `packages/ai/anthropic/src/AnthropicConfig.ts:74`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Runs an effect with an `AnthropicConfig` override that transforms the underlying `HttpClient` used by generated Anthropic requests.
- **Signature hint:** `declare function withClientTransform(transform: (client: HttpClient) => HttpClient): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withClientTransform<A, E, R>(self: Effect.Effect<A, E, R>, transform: (client: HttpClient) => HttpClient): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { AnthropicConfig } from "@effect/ai-anthropic"` and use `AnthropicConfig.withClientTransform`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `AnthropicConfig.withClientTransform`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig.getOrUndefined`

- **Source:** `packages/ai/anthropic/src/AnthropicConfig.ts:36`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Gets the configured Anthropic service from the current context when present.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig.getOrUndefined` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicConfig.ts:47`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing types associated with the `AnthropicConfig` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig.Service`

- **Source:** `packages/ai/anthropic/src/AnthropicConfig.ts:58`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration provided through `AnthropicConfig`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicConfig.AnthropicConfig.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
