---
"effect": patch
---

`ClusterCron` no longer retries a run that fails or dies, in either scheduling mode: the failure is logged and the next run is scheduled. With `calculateNextRunFromPrevious`, a failed run previously retried in place and blocked later runs; to keep that behavior, apply `Effect.retry` inside `execute`.
