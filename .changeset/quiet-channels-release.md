---
"effect": patch
---

Fix `Channel.mergeAll` and concurrent `Channel.flatMap` dropping inner scope finalizer defects, preserving both usage and release failures.
