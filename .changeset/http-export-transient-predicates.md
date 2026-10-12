---
"effect": minor
---

Export `HttpClient.isTransientError` and `HttpClient.isTransientResponse`, the predicates `retryTransient` retries on, so custom retry policies can classify failures consistently.
