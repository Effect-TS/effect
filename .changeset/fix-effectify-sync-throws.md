---
"effect": patch
---

Fix `Effect.effectify` discarding synchronous throws after a synchronous callback. These throws now become defects by default, or typed failures when `onSyncError` is provided.
