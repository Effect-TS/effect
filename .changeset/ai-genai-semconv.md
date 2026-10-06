---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Align AI tracing with the OpenTelemetry GenAI semantic conventions. This changes emitted span attribute keys: `gen_ai.system` becomes `gen_ai.provider.name` (the `system` option is deprecated in favor of `provider.name`, and old values such as `gemini` are mapped to their new names), `gen_ai.openai.request.response_format` becomes `gen_ai.output.type`, the other `gen_ai.openai.*` keys become `openai.*`, and the bare `concurrency`, `toolChoice` and `objectName` attributes become `effect.ai.concurrency`, `effect.ai.tool_choice` and `effect.ai.object_name`. `LanguageModel` spans now have kind `client`, and Anthropic `gen_ai.usage.input_tokens` includes cached tokens, with cache reads and writes reported separately.
