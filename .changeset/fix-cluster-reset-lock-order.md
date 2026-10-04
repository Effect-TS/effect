---
"effect": patch
---

Prevent PostgreSQL deadlocks between cluster message claims and shard or address resets by locking reset rows in message order.
