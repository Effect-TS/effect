---
"effect": patch
---

Fix `ClusterCron` with `calculateNextRunFromPrevious: true` not resuming after its pending run was lost.

In this mode every run is now processed by a single `executor` entity per cron job, so a restart no longer starts a second chain: runs never overlap and missed runs are caught up in order. Pending runs scheduled by earlier releases join the executor's chain. As a result, `Entity.CurrentAddress` inside `execute` no longer identifies the scheduled time; use the new `ClusterCron.CurrentScheduledTime` service instead, which is available in both modes.

Retry semantics also change in this mode: a run whose `execute` fails or dies is now logged and dropped instead of being retried until it succeeds or is older than `skipIfOlderThan`, because a retried run would block every later run on the shared executor. Interruptions are handled as before, and the default mode keeps retrying failed runs.
