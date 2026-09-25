---
"effect": patch
---

Fix `AtomRegistry` missing updates to stale nodes, leaking superseded builds and idle-TTL timers, and skipping the remaining listeners, finalizers, rebuilds and batch notifications when one throws. Updates also do less work and allocate less.
