---
"effect": patch
---

Defer `SqlMessageStorage` reply notifications, `SqlEventLogServerUnencrypted` changes and `Reactivity` invalidations until the outermost SQL commit, suppressing them on rollback. Preserve event-log sequence order across concurrent commits and reactivity batching across transaction boundaries.
