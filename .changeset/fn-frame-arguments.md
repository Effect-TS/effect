---
"effect": patch
---

Stop `Effect.fn` stack frames from keeping the call's arguments alive. A fiber forked inside an `Effect.fn` call inherits its stack frame, so it previously retained every argument of that call, and of every traced call above it, for as long as the fiber lived.
