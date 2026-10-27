---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-cloudflare": patch
"@effect/ai-typesafe": patch
---

Keep the cause of a failed HTTP request in the AI providers' `NetworkError`. An unknown host now reads `TransportError: fetch failed: getaddrinfo ENOTFOUND example.invalid` instead of `TransportError: A network error occurred.`, with sensitive header and query values redacted from the description.
