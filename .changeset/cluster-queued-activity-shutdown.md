---
"effect": patch
---

Fix cluster shutdown waiting for `entityTerminationTimeout` when a workflow is waiting on a persisted activity request that has not started. The caller is now abandoned so the request replays under the next owner.
