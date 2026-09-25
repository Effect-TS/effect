---
"effect": patch
---

Fix `PCGRandom.integer()` to use Lemire (2018) rejection sampling instead of `Math.round` + modulo, eliminating two sources of bias and halving state consumption per call.
