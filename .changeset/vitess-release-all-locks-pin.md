---
"effect": patch
---

Fix `SqlRunnerStorage` leaking shard locks on Vitess after releasing all shards. `RELEASE_ALL_LOCKS()` makes vtgate replace the session's lock connection, so the stored lock holder id went stale: later acquisitions took locks the runner already held a second time, and releasing such a shard left it locked. The storage now re-takes its pin lock after releasing all shards and refreshes the stored id.
