---
"effect": patch
---

Fix `SqlClient.withoutTransforms()` keeping query name transforms when no result transform is configured, and `Statement.make` ignoring its compiler when called again with the same acquirer.
