---
"effect": patch
---

Fix `Effect.fn` stack frames retaining call arguments. A fiber forked inside an `Effect.fn` call inherits the frame, which kept the arguments of that call and of every traced call above it alive for as long as the fiber ran.
