---
"effect": patch
---

Fix `Channel.merge` hanging or succeeding when a side finalizer fails, preserving both usage and finalizer failures.
