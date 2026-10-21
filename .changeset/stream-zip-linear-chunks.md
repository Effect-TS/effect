---
"effect": patch
---

Fix `Stream.zip` and related zip operators taking quadratic time when the two streams emit chunks of different sizes.
