---
"effect": patch
---

Defer terminal replies and request completion for persisted `ClusterSchema.WithTransaction` RPCs until commit or clean rollback. Replay requests when COMMIT or ROLLBACK fails.
