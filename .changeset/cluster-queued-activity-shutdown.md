---
"effect": patch
---

Fix cluster shutdown waiting for `entityTerminationTimeout` when a workflow is waiting on a persisted activity request that has not started. During runner shutdown the caller is now abandoned so the request replays under the next owner, and a durable caller abandoned this way is left for replay instead of being answered with an interrupt. With `preemptiveShutdown: false`, entities drain before the runner is marked as shutting down, so such a caller still waits for `entityTerminationTimeout`.
