---
"@effect/platform-bun": patch
---

Fix Bun worker shutdown when `self.close` is unavailable so worker finalizers complete before exit.
