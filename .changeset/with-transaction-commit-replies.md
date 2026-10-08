---
"effect": patch
---

Deliver terminal replies for persisted `ClusterSchema.WithTransaction` requests only after commit or clean rollback. On transaction failure, recover a committed reply or retry the request.
