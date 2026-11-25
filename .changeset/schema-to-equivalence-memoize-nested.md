---
"effect": patch
---

Memoize nested schema compilations in `Schema.toEquivalence` so shared sub-schemas are compiled once instead of once per path.
