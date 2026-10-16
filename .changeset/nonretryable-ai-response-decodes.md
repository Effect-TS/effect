---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-typesafe": patch
---

Mark provider response schema and SSE decoding failures as non-retryable to avoid repeated requests for incompatible response formats. Add an optional, serialized `retryable` flag to `AiError.InvalidOutputError`, defaulting to `true` so model-generated output validation failures remain retryable.
