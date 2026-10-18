---
"@effect/vitest": patch
---

Reject Effect and Promise returns from synchronous `it.prop` callbacks instead of silently passing. Callbacks must return a boolean or `void`; use `it.effect.prop` for Effect callbacks.
