---
"effect": patch
---

Deliver replies for persisted cluster RPCs using `ClusterSchema.WithTransaction` only after the transaction outcome is known. Callers no longer see a success before COMMIT, and the request is marked processed only after it commits. If COMMIT or ROLLBACK fails, the reply is dropped and the request is replayed.
