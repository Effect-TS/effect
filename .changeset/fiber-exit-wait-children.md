---
"effect": patch
---

Fix an interrupted fiber losing its exit, such as a finalizer defect, when a child fiber does not stop immediately.
