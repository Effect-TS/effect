---
"@effect/platform-browser": patch
---

Skip `close()` when a `BrowserWorkerRunner` port does not implement it, so closing the runner no longer throws in Bun workers.
