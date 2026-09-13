---
"effect": patch
---

Tie non-persisted RunnerServer Stream and Effect requests to their caller's scope. Disconnects release handler resources and mailbox capacity, including requests waiting for an entity rebuild. Already-closed callers are not admitted, and departed callers' requests are not replayed. Cleanup respects `Uninterruptible: true`, `"client"`, and `"server"`; explicit interrupts and persisted reconnect/resume behavior are preserved.

Fixes EFF-1363, EFF-1366, and EFF-1367.
