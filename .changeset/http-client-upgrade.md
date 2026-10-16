---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-browser": patch
"@effect/ai-anthropic": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-typesafe": patch
---

Add HTTP/1.1 upgrades to `HttpClient`. `HttpClientRequest.upgrade("tcp")` asks the server to switch protocols, and `HttpClientResponse.upgrade` hands over the connection of a `101 Switching Protocols` response as a `Socket`. The node:http and Undici clients support upgrades. Fetch and `XMLHttpRequest` clients fail with the new `UpgradeNotSupportedError` reason.
