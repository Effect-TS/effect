---
"effect": patch
---

Fix `TestClock` interrupting an uninterruptible finalizer on its first sleep and skipping subsequent cleanup.
