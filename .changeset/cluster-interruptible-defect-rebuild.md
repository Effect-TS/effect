---
"@effect/cluster": patch
---

Rebuild entities after a defect with interruption enabled. The rebuild inherited the RPC server's interruption-disabled flags, so fibers forked by the rebuilt entity could not be interrupted and a second defect, shard release, or shutdown would hang.
