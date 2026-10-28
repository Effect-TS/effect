---
"effect": minor
"@effect/ai-anthropic": minor
"@effect/ai-cloudflare": minor
"@effect/ai-openai": minor
"@effect/ai-openai-compat": minor
"@effect/ai-openrouter": minor
"@effect/ai-typesafe": minor
---

Remove `AiError.HttpRequestDetails` and `Response.HttpRequestDetails`, so AI errors and response metadata no longer carry request headers or query parameters. `AiError.NetworkError` records the request as `method` and `url` fields instead of `request`, and the `request` field is gone from `AiError.HttpContext` and `Response.ResponseMetadataPart`.
