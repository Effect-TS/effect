---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Update AI tracing to use current OpenTelemetry GenAI conventions:

- Replace `gen_ai.system` with `gen_ai.provider.name`. The deprecated `system` option remains supported, with legacy provider names mapped to their replacements.
- Move OpenAI service-tier and system-fingerprint attributes from `gen_ai.openai.*` to `openai.*`, and report response format as `gen_ai.output.type` (`json_object` and `json_schema` become `json`).
- Use client spans for `LanguageModel` and namespace `concurrency`, `toolChoice` and `objectName` as `effect.ai.concurrency`, `effect.ai.tool_choice` and `effect.ai.object_name`. Tool choices record the resolved value, defaulting to `effect.ai.tool_choice = "auto"`; object choices are JSON-encoded.
- Include cached tokens in Anthropic `gen_ai.usage.input_tokens` and report cache reads and writes separately.
