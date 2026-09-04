---
"effect": patch
---

Fix `RequestResolver.fromEffectTagged` to resolve requests from finite iterable results, including iterators and generators, rather than requiring an array. Results still correspond to requests in order and must have the same length as the batch.
