---
"effect": minor
---

change `Sink` type parameters order from `Sink<out R, out E, in In, out L, out Z>` to `Sink<out A, in In = unknown, out L = never, out E = never, out R = never>`
