---
"effect": patch
---

Fix `Iterable.unfold` iterators calling the generating function again after they have returned `done`.
