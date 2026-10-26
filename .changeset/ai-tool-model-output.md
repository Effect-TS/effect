---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Add a `toModelOutput` option to `Tool.make` and `Tool.dynamic` that maps a successful tool result to `Prompt.TextPart` and `Prompt.FilePart` content, carried in the new optional `modelOutput` field of tool result parts. Anthropic and OpenAI Responses send that content as native text, image and document blocks in place of the serialized result, while text-only providers (OpenAI-compatible APIs and OpenRouter) send it as text with a placeholder for each file, using the new `Prompt.toolModelOutputToText`, instead of the serialized result. Tools without a mapping keep sending the serialized result. OpenAI Responses now also sends PDF file parts given as base64, data URL or HTTP(S) URL strings instead of dropping them.
