---
"effect": patch
---

Fix `Effect.flatMap`, `Effect.catchCause`, `Effect.matchCauseEffect`, and their derived operators to pass only the documented value or cause to callbacks. Callback default parameters now retain their defaults, and rest parameters no longer receive internal runtime arguments.
