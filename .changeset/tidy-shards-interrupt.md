---
"effect": patch
---

Add `ClusterSchema.InterruptOnTermination` to interrupt opted-in RPCs as soon as entity termination starts. Persisted requests resume under the next owner without saving an interrupt reply, and server-side `Uninterruptible` takes precedence.
