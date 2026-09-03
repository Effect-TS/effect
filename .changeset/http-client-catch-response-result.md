---
"effect": patch
---

Constrain the data-first `HttpClient.catch(client, recover)` overload to recover with `HttpClientResponse` values, matching the existing data-last overload. Response subtypes and recoveries that never succeed remain supported, and all five generic parameters are preserved.

This intentionally rejects callbacks returning arbitrary success values, such as numbers or `undefined`, that previously type-checked despite the client's response return type. To recover to other values, apply `Effect.catch` to the request effect returned by `client.execute(request)` instead of recovering inside `HttpClient.catch`.

Runtime behavior, error propagation, request security, and replay policies are unchanged.
