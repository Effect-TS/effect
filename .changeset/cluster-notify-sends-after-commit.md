---
"effect": patch
---

Defer the runner notification for a discarded persisted send made inside a `ClusterSchema.WithTransaction` handler until the transaction commits. The message was invisible to the runner before the commit, so delivery waited for the next storage poll.
