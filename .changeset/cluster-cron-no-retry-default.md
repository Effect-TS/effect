---
"effect": patch
---

`ClusterCron` no longer retries a run that fails or dies, in either scheduling mode: the failure is logged and the next run is scheduled. With `calculateNextRunFromPrevious`, a failed run previously retried in place and blocked later runs; to retry typed failures, apply `Effect.retry` inside `execute` with your own stopping policy.
