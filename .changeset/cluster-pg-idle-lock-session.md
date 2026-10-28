---
"effect": patch
---

Release a frozen runner's PostgreSQL advisory shard locks after `shardLockExpiration`. On PostgreSQL 14+, `SqlRunnerStorage` sets `idle_session_timeout` on its lock connection, so a runner that stops refreshing loses its locks instead of holding them until the server drops its TCP connection.

With advisory locks on PostgreSQL and MySQL, `SqlRunnerStorage` refresh now only confirms locks its current lock session holds. After the lock connection is replaced, shards held by the previous session are reported lost instead of being silently reacquired.
