---
"@effect/ai-openai-compat": patch
---

Pass `Config` and `OpenAiConfig` as `EmbeddingModel.make`'s `settings`, so concurrent `embed` calls no longer apply the first caller's `withConfigOverride` or `withClientTransform` to the whole batch. Callers with equal settings still share one provider request.
