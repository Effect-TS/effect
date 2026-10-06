---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Align AI tracing with the OpenTelemetry GenAI semantic conventions. Spans now record `gen_ai.provider.name` instead of the deprecated `gen_ai.system` (the `system` option is deprecated in favor of `provider.name`), language model spans are client spans with `effect.ai.concurrency` and `effect.ai.tool_choice` attributes, and OpenAI metadata moves to `gen_ai.output.type` and `openai.*` keys. Anthropic `gen_ai.usage.input_tokens` now includes cached tokens, with cache reads and writes reported separately.
