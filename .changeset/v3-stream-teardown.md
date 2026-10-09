---
"@effect/cluster": patch
---

Interrupt non-persisted streaming RPCs on entity teardown and defect restart instead of waiting for them or replaying them. Preserve persisted-stream replay and non-stream request grace periods.
