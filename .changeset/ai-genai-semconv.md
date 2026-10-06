---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Update AI tracing to use current OpenTelemetry GenAI conventions:

- Replace `gen_ai.system` with `gen_ai.provider.name`. The `system` option, `BaseAttributes` and `WellKnownSystem` are removed in favor of `provider: { name }`, `ProviderAttributes` and `WellKnownProviderName`.
- Remove `gen_ai.token.type`, which is not a span attribute in the current conventions, along with the `token` option, `TokenAttributes` and the `AllAttributes` types.
- `LanguageModel` spans are client spans and record `gen_ai.output.type` (`text` or `json`) for every provider. The OpenAI `responseFormat` telemetry option and `WellKnownResponseFormat` are removed.
- Move OpenAI service-tier and system-fingerprint attributes from `gen_ai.openai.*` to `openai.*`.
- Rename `concurrency`, `toolChoice` and `objectName` span attributes to `effect.ai.concurrency`, `effect.ai.tool_choice` and `effect.ai.object_name`. Tool choices record the resolved value, defaulting to `"auto"`; object choices are JSON-encoded.
- Include cached tokens in Anthropic `gen_ai.usage.input_tokens` and report cache reads and writes as `gen_ai.usage.cache_read.input_tokens` and `gen_ai.usage.cache_write.input_tokens`. The duplicate Anthropic `cacheCreationInputTokens` and `cacheReadInputTokens` response options are removed.
