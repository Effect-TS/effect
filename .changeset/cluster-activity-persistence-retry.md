---
"effect": patch
---

Retry transient `PersistenceError`s when a cluster workflow sends an activity or reads its reply during a pending interrupt, instead of storing the failure as a workflow defect. A request whose save was committed but not acknowledged is deduplicated, so the activity still runs once.

A cluster client request whose send fails is no longer retained by `Sharding`.
