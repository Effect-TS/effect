---
"@effect/cluster": patch
---

Add `ClusterSchema.InterruptOnTermination`, which interrupts opted-in RPCs as soon as entity termination starts instead of waiting for `entityTerminationTimeout`. Persisted requests resume on the next owner, and server-side `Uninterruptible` takes precedence.
