---
"effect": patch
---

Restart the random sequence from the seed on each evaluation of an effect wrapped with `Random.withSeed`. This also ensures repeated evaluations of `TestCrypto.make` and independent builds of `TestCrypto.layer` start fresh deterministic sequences.
