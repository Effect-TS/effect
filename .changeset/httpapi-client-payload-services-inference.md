---
"effect": patch
---

Fix `HttpApiClient` method calls inside `Effect.all` widening their required services to `any`, and reading services off a non-streaming method's type giving `unknown`.
