---
"effect": patch
---

Release shard locks one at a time. When a runner joined, the runner handing shards off released them all at once, and on PostgreSQL and MySQL every release queued on the one lock connection. A burst that took longer than the lock refresh interval timed every release out together, `SqlRunnerStorage` replaced the lock connection, and closing it dropped every lock the runner held, including shards it kept, so requests on those shards could run twice. A lock refresh or acquire now waits behind at most one release.
