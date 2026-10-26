---
"effect": patch
---

Add `SqlClient.addTransaction` for drivers that implement `withTransaction` themselves. It adds the transaction level to the context and marks it for `SqlResolver`, so requests inside the transaction keep their own batch when the caller's context has no `SqlClient` for the driver. `makeWithTransaction` now uses it.
