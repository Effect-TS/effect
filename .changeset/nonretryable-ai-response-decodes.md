---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-typesafe": patch
---

Add non-retryable `AiError.InvalidResponseError` for provider response schema and SSE decoding failures, with optional HTTP context; model-generated output validation remains retryable. Update exhaustive matches on `AiErrorReason` to handle the new tag, and update serialized-error consumers to accept it.
