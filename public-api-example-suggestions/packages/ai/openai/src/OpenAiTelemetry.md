# Example Suggestions: `@effect/ai-openai/OpenAiTelemetry`

- **Package:** `@effect/ai-openai`
- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 0 recommended, 12 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority     |
| ------------------------------------------------------------------------ | ---: | ------------------ | ------------ |
| `@effect/ai-openai/OpenAiTelemetry.OpenAiTelemetryAttributeOptions`      |  116 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.addGenAIAnnotations`                  |  149 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.OpenAiTelemetryAttributes`            |   29 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.AllAttributes`                        |   42 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.RequestAttributes`                    |   51 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.RequestAttributes.responseFormat`     |   55 | `member`           | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.RequestAttributes.serviceTier`        |   59 | `member`           | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes`                   |   69 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes.serviceTier`       |   73 | `member`           | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes.systemFingerprint` |   78 | `member`           | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.WellKnownResponseFormat`              |   93 | `root-declaration` | **optional** |
| `@effect/ai-openai/OpenAiTelemetry.WellKnownServiceTier`                 |  107 | `root-declaration` | **optional** |

## Optional

### `@effect/ai-openai/OpenAiTelemetry.OpenAiTelemetryAttributeOptions`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:116`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options accepted by `addGenAIAnnotations`, combining standard GenAI telemetry attributes with optional OpenAI request and response attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.OpenAiTelemetryAttributeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.addGenAIAnnotations`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:149`
- **Kind / category:** `root-declaration` / `tracing`
- **Priority:** **optional**
- **Current description:** Applies the specified OpenAI GenAI telemetry attributes to the provided `Span`.
- **Signature hint:** `declare function addGenAIAnnotations(options: OpenAiTelemetryAttributeOptions): (span: Span) => void declare function addGenAIAnnotations(span: Span, options: OpenAiTelemetryAttributeOptions): void`
- **Import guidance:** Start from `import { OpenAiTelemetry } from "@effect/ai-openai"` and use `OpenAiTelemetry.addGenAIAnnotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Applies the specified OpenAI GenAI telemetry attributes to the provided `Span`. Call `OpenAiTelemetry.addGenAIAnnotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.OpenAiTelemetryAttributes`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The attributes used to describe telemetry in the context of Generative Artificial Intelligence (GenAI) Models requests and responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.OpenAiTelemetryAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.AllAttributes`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** All telemetry attributes which are part of the GenAI specification, including the OpenAI-specific attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.AllAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.RequestAttributes`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:51`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.openai.request`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.RequestAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.RequestAttributes.responseFormat`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:55`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The response format that is requested.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiTelemetry.RequestAttributes.responseFormat` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.RequestAttributes.serviceTier`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:59`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The service tier requested. May be a specific tier, `default`, or `auto`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiTelemetry.RequestAttributes.serviceTier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:69`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.openai.response`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes.serviceTier`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The service tier used for the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes.serviceTier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes.systemFingerprint`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:78`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A fingerprint to track any eventual change in the Generative AI environment.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiTelemetry.ResponseAttributes.systemFingerprint` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.WellKnownResponseFormat`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:93`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `gen_ai.openai.request.response_format` attribute has the following list of well-known values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.WellKnownResponseFormat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiTelemetry.WellKnownServiceTier`

- **Source:** `packages/ai/openai/src/OpenAiTelemetry.ts:107`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `gen_ai.openai.request.service_tier` attribute has the following list of well-known values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiTelemetry.WellKnownServiceTier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
