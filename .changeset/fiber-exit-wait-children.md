---
"effect": patch
---

Keep a fiber's exit when it is interrupted and a child it waits for on exit does not stop at once: the wait for children is now uninterruptible, so a finalizer's defect is no longer replaced by the bare interruption.
