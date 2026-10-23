---
"effect": patch
---

Fix `HttpApiClient` methods inferring their streaming payload services from the contextual return type. Calls passed to `Effect.all`, which types each element as `Effect<any, any, any>`, had their services widened to `any`, even for endpoints without a streaming payload. Payload services are now inferred only from the `payload` argument.
