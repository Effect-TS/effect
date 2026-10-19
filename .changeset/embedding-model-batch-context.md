---
"effect": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Add an optional `batchKey` to `EmbeddingModel.make` to group concurrent `embed` calls by provider-relevant context. OpenAI and OpenAI-compatible providers now separate batches with different configuration overrides or client transforms. Undeclared context, such as per-call `FetchHttpClient.RequestInit`, still uses the first caller's value.
