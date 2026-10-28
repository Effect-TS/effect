---
"effect": patch
---

Release a frozen runner's PostgreSQL advisory shard locks after `shardLockExpiration`. On PostgreSQL 14+, `SqlRunnerStorage` sets `idle_session_timeout` on its lock connection, so a runner that stops refreshing loses its locks instead of holding them until the server drops its TCP connection.
