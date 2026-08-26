---
"effect": patch
---

Use a shared xoshiro128** generator for `Random.withSeed` and Arbitrary. This reduces initialization time and bundle size
while preserving deterministic generation and replay. Seeded `Random` sequences change, and `Random` documentation now
directs security-sensitive uses to the `Crypto` service.
