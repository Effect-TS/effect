---
"effect": minor
"@effect/ai-anthropic": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-typesafe": patch
---

Add an optional `cause` to the AI `NetworkError`. It holds the `HttpClientError` the request failed with, so the reason a request failed is no longer lost. `NetworkError.fromRequestError` accepts it as an optional second argument, and all AI providers now pass it.
