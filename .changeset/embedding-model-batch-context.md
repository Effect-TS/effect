---
"effect": patch
---

Fix `EmbeddingModel.make` running a batch of concurrent `embed` calls with the first caller's context, which applied one caller's per-call settings to every caller in the batch.

`embed` calls now share a batch only when their contexts hold the same services, ignoring services that differ on every call such as the current span, log annotations, and retry metadata. Providers can pass the new `settings` option to list the services that hold their per-call options; those services are compared by value, so callers with equal settings still share one `embedMany` call. A consequence is that `embed` calls under different scopes or request contexts, such as different HTTP or RPC requests, no longer share a provider call.
