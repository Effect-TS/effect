---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Fail with an `UnsupportedSchemaError` that names the tool when its parameters do not produce a JSON Schema object, for example `Schema.Struct({})`. The error keeps the underlying cause and suggests `Tool.EmptyParams` for a tool without parameters.

Before, OpenAI and OpenAI-compatible providers reported the error without the tool name, and Anthropic and OpenRouter sent the request. A raw JSON Schema given to `Tool.dynamic` is still sent unchanged.
