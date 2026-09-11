---
"@effect/cluster": minor
"@effect/workflow": minor
---

Fix cluster shutdown routing and durable workflow abandonment. Persisted requests abandoned during shutdown interrupt for replay without running durable workflow finalizers or waking the parent. Abandonment signals the fiber, respects interruption masking, and cannot be swallowed by a workflow body's `catchAllCause` or `exit`. Volatile requests and abandoned acknowledgements expose `EntityNotAssignedToRunner`; local discard sends settle during shutdown while remote volatile discards still reach live peers. Limit internal interruption classification to active entity, shard, and client teardown.

Fix entity registration timing and service overrides, remote volatile discard delivery, malformed persisted reply fallback, stream completion, failed resource acquisition cleanup, and test-client fatal-defect configuration. Correct in-memory runner health and message cleanup, SQL by-ID acknowledgement decoding, PostgreSQL acquired-shard reporting, and empty shard-lock liveness probes.

PostgreSQL advisory locks now include the configured storage prefix. Stop every runner using the old lock protocol before starting any runner using the new protocol. A rolling deployment can let old and new runners own the same shard. Runner notifications also carry a persisted flag, so update all runner peers together.
