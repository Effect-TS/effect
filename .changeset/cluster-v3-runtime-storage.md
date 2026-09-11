---
"@effect/cluster": minor
"@effect/workflow": minor
---

Fix cluster shutdown routing and durable workflow abandonment. Persisted requests abandoned during shutdown or target-manager teardown interrupt for replay. This affects all entity callers, including callers outside workflows: relayed abandonment signals the calling or mailbox-reading fiber, respects interruption masking, and cannot be swallowed by its `catchAllCause` or `exit`. Durable workflow attempts stop without persisting Complete, running durable finalizers or waking the parent. Volatile requests and abandoned acknowledgements expose `EntityNotAssignedToRunner`; local discard sends settle during shutdown while remote volatile discards still reach live peers. Limit internal interruption classification to active entity, shard, and client teardown.

The attempt-owner mechanism is a v3-specific adaptation beyond the upstream port. The v3 stream channel executor reads in a child fiber and relays its exit through a deferred. Marked abandonment therefore also interrupts the active workflow or activity owner to prevent recovery from persisting an incorrect Complete. This is stronger than upstream behavior: a detached child that encounters marked abandonment while its owner is active also interrupts that owner. After execution ends, inherited owner references are inert.

Fix entity registration timing and service overrides, remote volatile discard delivery, malformed persisted reply fallback, stream completion, failed resource acquisition cleanup, and test-client fatal-defect configuration. Correct in-memory runner health and message cleanup, SQL by-ID acknowledgement decoding, PostgreSQL acquired-shard reporting, and empty shard-lock liveness probes.

PostgreSQL advisory locks now include the configured storage prefix. Stop every runner using the old lock protocol before starting any runner using the new protocol. A rolling deployment can let old and new runners own the same shard. Runner notifications also carry a persisted flag, so update all runner peers together.
