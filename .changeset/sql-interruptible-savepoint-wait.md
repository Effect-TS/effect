---
"effect": patch
---

Allow interrupting a nested `withTransaction` while it waits for another nested transaction to release the savepoint, like a top-level transaction waiting for a connection.
