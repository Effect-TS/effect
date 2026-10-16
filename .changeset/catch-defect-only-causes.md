---
"effect": patch
---

Fix `Effect.catchDefect`, `Stream.catchDefect`, and `Channel.catchDefect` to preserve causes containing typed failures or interruptions alongside defects. Causes containing only defects remain recoverable.
