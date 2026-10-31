---
"effect": patch
---

Notify discarded persisted sends from `ClusterSchema.WithTransaction` handlers after the outermost commit, so they do not wait for the next storage poll.
