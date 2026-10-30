---
"effect": patch
---

Stop GraphQL calls from succeeding on non-2xx HTTP responses. A non-2xx GraphQL body without `errors`, including `{ data: null }`, now fails with a `TransportError` carrying the HTTP `status`, `headers` and `Retry-After`, so retry policies on `isRetryable` apply. A non-2xx body with `data` and `errors` fails with a `ResponseError` even with `{ partial: true }`.
