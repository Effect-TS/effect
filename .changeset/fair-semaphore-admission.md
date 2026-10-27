---
"effect": patch
---

Prevent later `Semaphore.take` calls from overtaking eligible queued requests while preserving mixed-size overtaking.
