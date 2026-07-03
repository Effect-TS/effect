---
"@effect/ai-anthropic": minor
---

Add `apiKeyHeader`, `apiKeyScheme`, and `headers` options to `AnthropicClient.make`/`layer`/`layerConfig`, allowing the API key header name (e.g. `authorization`), its auth scheme prefix (e.g. `Bearer`/`OAuth`), and arbitrary extra request headers to be customized. Useful when targeting a gateway or proxy in front of Anthropic's API that expects different authentication conventions.
