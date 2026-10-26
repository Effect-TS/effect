---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Fail with an `UnsupportedSchemaError` that names the tool when its parameters do not produce a JSON Schema object, for example `Schema.Struct({})`.
