---
"effect": minor
---

change `Channel` type parameters order from `Channel<out Env, in InErr, in InElem, in InDone, out OutErr, out OutElem, out OutDone>` to `Channel<OutElem, InElem = unknown, OutErr = never, InErr = unknown, OutDone = void, InDone = unknown, Env = never>`
