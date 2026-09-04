---
"effect": patch
---

Fix `Effect.flatMap`, `Effect.catchCause`, `Effect.matchCauseEffect`, `Effect.catchDefect`, `Effect.onError`, and their derived operators to invoke callbacks with only the documented argument and without an internal receiver. Callback default parameters now retain their defaults, and rest parameters no longer receive internal runtime arguments.
