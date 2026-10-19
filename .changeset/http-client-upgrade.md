---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-browser": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/ai-anthropic": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-typesafe": patch
---

Add raw HTTP/1.1 upgrades through `HttpClientRequest.upgrade`, `HttpClientResponse.upgrade`, the Node HTTP server, and `HttpApiSchema.Upgrade`. Node clients expose the upgraded connection as a `Socket`; HttpApi clients return `{ headers, socket }` and OpenAPI documents the 101 response.

Custom `HttpClientResponse` implementations must add `upgrade`, and exhaustive `HttpClientErrorReason` switches must handle `UpgradeNotSupportedError`. Fetch and XMLHttpRequest now reject upgrade requests before sending; Bun and Deno servers still support only WebSocket upgrades.
