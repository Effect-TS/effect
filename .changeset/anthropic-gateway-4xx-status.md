---
"@effect/ai-anthropic": patch
---

Map Anthropic-compatible gateway 4xx responses without a valid Anthropic error envelope by HTTP status instead of reporting `InvalidOutputError`. This preserves `InvalidRequestError` for 400 and `RateLimitError` with `retryAfter` for 429. Direct calls to `AnthropicClient.client.betaMessagesPost` now fail with `HttpClientError` (`StatusCodeError`) rather than `SchemaError` for these responses.
