---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Add a `toModelOutput` option to `Tool.make` and `Tool.dynamic` for sending text, images and files to the model in place of the serialized tool result. Anthropic and OpenAI Responses send native content blocks; OpenAI-compatible APIs and OpenRouter send text with a placeholder for each file, via the new `Prompt.toolModelOutputToText`.

OpenAI Responses now sends PDF file parts given as base64, data URL or HTTP(S) URL strings instead of dropping them.
