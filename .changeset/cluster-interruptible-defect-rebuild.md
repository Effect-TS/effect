---
"@effect/cluster": patch
---

Rebuild an entity after a defect interruptibly, so fibers forked by the rebuilt entity can be interrupted. Previously the rebuild inherited the RPC server's interruption-disabled runtime flags: a second defect left the entity stuck rebuilding, and shard release and the shutdown handoff hung while closing its scope.
