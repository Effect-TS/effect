---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Fail with a clear `UnsupportedSchemaError` when the parameters of a tool do not produce a JSON Schema object. The error names the tool and suggests `Tool.EmptyParams` for tools without parameters. Before, OpenAI failed with a message that did not name the tool, and Anthropic and OpenRouter sent a schema that the API rejects.
