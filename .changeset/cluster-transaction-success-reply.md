---
"effect": patch
---

Fix persisted success replies being stored after a `ClusterSchema.WithTransaction` request transaction rolled back. A failed save inside the request transaction is no longer retried, since a retry could autocommit the reply outside the aborted transaction (for example after a MySQL deadlock). The failed transaction now replays the request instead.
