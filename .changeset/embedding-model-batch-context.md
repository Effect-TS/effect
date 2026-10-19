---
"effect": patch
---

Fix `EmbeddingModel.make` running concurrent `embed` calls in one batch with the first caller's context, so every caller got the first caller's settings.

`embed` calls now share a batch only when their contexts have the same services. Services that change on every call, such as the current span and log annotations, are ignored. Providers can list the services that hold their options in the new `settings` option. These services are compared by value, so callers with equal settings still share one `embedMany` call. `embed` calls from different HTTP or RPC requests no longer share a provider call.
