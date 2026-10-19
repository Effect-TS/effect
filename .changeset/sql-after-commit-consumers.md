---
"effect": patch
---

`SqlEventLogServerUnencrypted` publication and `Reactivity` invalidations inside a SQL transaction now wait for the outermost commit and are dropped on rollback.
