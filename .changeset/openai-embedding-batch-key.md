---
"@effect/ai-openai": patch
---

Fix concurrent `embed` calls using the first caller's `withConfigOverride` or `withClientTransform` for the whole batch. Calls now share a request only when their `Config` and `OpenAiConfig` values are equal. Other per-call HTTP-client context, such as `FetchHttpClient.RequestInit`, still takes the first caller's value.
