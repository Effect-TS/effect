---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
"@effect/ai-cloudflare": patch
"@effect/ai-typesafe": patch
---

Add typed HTTP date and `Retry-After` header values to `Headers`, and parse them consistently across the HTTP client, OTLP exporter, GraphQL client, AI clients and static server.

- `Headers.parseHttpDate` / `Headers.formatHttpDate` read all three RFC 9110 date formats as UTC, whatever the process time zone, and emit IMF-fixdate.
- `Headers.parseRetryAfter`, `Headers.formatRetryAfter` and `Headers.retryAfterDelay` accept whole non-negative seconds (up to `Number.MAX_SAFE_INTEGER`) or an HTTP date, and the delay is never negative. HTTP dates accept the `23:59:60` leap second, read as the following second.
- `Schema.DateTimeUtcFromHttpDate` and `Schema.RetryAfterFromString` expose the same parsing as string codecs for HTTP API headers.
- Invalid `Retry-After` values such as `-5`, `1.5`, `1e3` or `Infinity` are now ignored everywhere. `HttpClient.retryTransient` and `HttpClient.withRateLimiter` no longer honour fractional seconds, and the AI clients no longer produce negative or infinite `retryAfter` durations.
- `HttpStaticServer` reads `If-Modified-Since` and `Last-Modified` as UTC; asctime dates were previously shifted by the process time zone.
