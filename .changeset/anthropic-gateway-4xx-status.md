---
"@effect/ai-anthropic": patch
---

Map malformed Anthropic-compatible gateway 4xx errors by status instead of `InvalidOutputError`, including 429 retry delays. Direct `AnthropicClient.client.betaMessagesPost` calls now fail with `HttpClientError` instead of `SchemaError` for these responses.
