---
"@effect/cluster": patch
---

Add `ClusterSchema.InterruptOnTermination` to interrupt opted-in RPCs as soon as entity termination starts, instead of waiting for `entityTerminationTimeout`. Persisted requests resume under the next owner without saving an interrupt reply, and server-side `Uninterruptible` takes precedence. Backport of #8963.
