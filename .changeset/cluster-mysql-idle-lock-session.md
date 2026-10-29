---
"effect": patch
---

Release a frozen runner's MySQL shard locks after `shardLockExpiration`. `SqlRunnerStorage` sets `wait_timeout` on its MySQL lock connection, so a runner that stops refreshing loses its named locks instead of holding them until the server drops its TCP connection. Vitess ignores `wait_timeout`, so runners behind Vitess keep the previous behavior.
