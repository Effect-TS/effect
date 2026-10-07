---
"effect": patch
---

Defer terminal replies and request completion for persisted `ClusterSchema.WithTransaction` RPCs until commit or clean rollback. Recover stored replies when COMMIT applied but reported failure after a successful handler; otherwise replay on COMMIT or ROLLBACK failure.
