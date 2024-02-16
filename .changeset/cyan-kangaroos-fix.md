---
"effect": minor
---

swap `GroupBy` type parameters from `GroupBy<out R, out E, out K, out V>` to `GroupBy<out K, out V, out E = never, out R = never>`
