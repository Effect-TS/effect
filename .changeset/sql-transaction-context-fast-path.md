---
"effect": patch
---

Avoid redundant service-map merges in `SqlClient.makeWithTransaction` when the fiber context has not changed before the transaction body runs.
