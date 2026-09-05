---
"effect": patch
---

Fix `Effect.flatMap` and the deferred path of `Effect.flatMapEager` passing internal runtime arguments to callbacks with default or rest parameters. Callbacks now receive only the success value regardless of their declared arity.
