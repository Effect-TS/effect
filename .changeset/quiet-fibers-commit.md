---
"effect": patch
---

Fix child fibers reusing completed transaction journals so later transactions commit their writes.
