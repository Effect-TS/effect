# Example Suggestions: `@effect/ai-openai-compat/OpenAiTelemetry`

- **Package:** `@effect/ai-openai-compat`
- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 0 recommended, 12 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                             | Line | Kind               | Priority     |
| ------------------------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/ai-openai-compat/OpenAiTelemetry.OpenAiTelemetryAttributeOptions`      |  115 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.addGenAIAnnotations`                  |  151 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.OpenAiTelemetryAttributes`            |   28 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.AllAttributes`                        |   41 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes`                    |   50 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes.responseFormat`     |   54 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes.serviceTier`        |   58 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes`                   |   68 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes.serviceTier`       |   72 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes.systemFingerprint` |   77 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.WellKnownResponseFormat`              |   92 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiTelemetry.WellKnownServiceTier`                 |  106 | `root-declaration` | **optional** |

## Optional

### `@effect/ai-openai-compat/OpenAiTelemetry.OpenAiTelemetryAttributeOptions`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:115`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options accepted by `addGenAIAnnotations`, combining standard GenAI telemetry attributes with optional OpenAI-compatible request and response attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.OpenAiTelemetryAttributeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.addGenAIAnnotations`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:151`
- **Kind / category:** `root-declaration` / `tracing`
- **Priority:** **optional**
- **Current description:** Applies the specified OpenAI GenAI telemetry attributes to the provided `Span`.
- **Signature hint:** `declare function addGenAIAnnotations(options: OpenAiTelemetryAttributeOptions): (span: Span) => void declare function addGenAIAnnotations(span: Span, options: OpenAiTelemetryAttributeOptions): void`
- **Import guidance:** Start from `import { OpenAiTelemetry } from "@effect/ai-openai-compat"` and use `OpenAiTelemetry.addGenAIAnnotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Applies the specified OpenAI GenAI telemetry attributes to the provided `Span`. Call `OpenAiTelemetry.addGenAIAnnotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.OpenAiTelemetryAttributes`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:28`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The attributes used to describe telemetry in the context of Generative Artificial Intelligence (GenAI) Models requests and responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.OpenAiTelemetryAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.AllAttributes`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** All telemetry attributes which are part of the GenAI specification, including the OpenAI-specific attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.AllAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.openai.request`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes.responseFormat`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The response format that is requested.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes.responseFormat` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes.serviceTier`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:58`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The service tier requested. May be a specific tier, `default`, or `auto`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiTelemetry.RequestAttributes.serviceTier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.openai.response`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes.serviceTier`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The service tier used for the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes.serviceTier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes.systemFingerprint`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:77`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A fingerprint to track any eventual change in the Generative AI environment.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiTelemetry.ResponseAttributes.systemFingerprint` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.WellKnownResponseFormat`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:92`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `gen_ai.openai.request.response_format` attribute has a list of well-known values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.WellKnownResponseFormat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiTelemetry.WellKnownServiceTier`

- **Source:** `packages/ai/openai-compat/src/OpenAiTelemetry.ts:106`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `gen_ai.openai.request.service_tier` attribute has a list of well-known values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiTelemetry.WellKnownServiceTier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
