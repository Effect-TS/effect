---
"@effect/ai-openai-compat": patch
---

Fix concurrent `embed` calls using the first caller's `withConfigOverride` or `withClientTransform` for the whole batch. `OpenAiEmbeddingModel` now passes `Config` and `OpenAiConfig` as `settings` to `EmbeddingModel.make`, so callers with equal settings still share one request.
