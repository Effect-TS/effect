---
"effect": patch
---

Fix `Number.nextPow2` returning the wrong power of two for some large inputs, such as `2 ** 29` and `2 ** 52 + 1`.
