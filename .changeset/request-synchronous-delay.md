---
"effect": patch
---

Fix request resolvers with synchronous delay effects, such as `RequestResolver.setDelayEffect(Effect.void)`, executing an empty batch instead of resolving the request.
