---
"effect": minor
"@effect/ai-anthropic": minor
"@effect/ai-cloudflare": minor
"@effect/ai-openai": minor
"@effect/ai-openai-compat": minor
"@effect/ai-openrouter": minor
"@effect/ai-typesafe": minor
---

Remove `AiError.HttpRequestDetails` and `Response.HttpRequestDetails`. `AiError.NetworkError` now has `method` and `url` fields in place of `request`, `AiError.HttpContext` no longer has a `request` field, and `Response.ResponseMetadataPart` no longer has a `request` field. AI errors and response metadata no longer include request headers or query parameters.
