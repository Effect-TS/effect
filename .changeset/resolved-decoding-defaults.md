---
"effect": patch
---

Keep `Schema` decoding synchronous when a decoding default is an already-successful effect, such as `Effect.succeed(...)`.
