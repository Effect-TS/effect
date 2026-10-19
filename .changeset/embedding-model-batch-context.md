---
"effect": patch
---

Fix `EmbeddingModel.embed` batching concurrent calls with different caller context into one provider call, so every caller got the first caller's settings.

`EmbeddingModel.make` accepts an optional `batchKey`. Calls share one `embedMany` call only when their keys are equal, so providers return the context values `embedMany` reads. Without `batchKey`, all calls still share one batch.
