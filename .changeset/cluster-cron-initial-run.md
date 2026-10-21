---
"effect": patch
---

Fix `ClusterCron` with `calculateNextRunFromPrevious: true` not resuming after its pending run was lost.

In this mode every run is now processed by a single `executor` entity per cron job, so a restart no longer starts a second chain: runs never overlap and missed runs are caught up in order. Pending runs scheduled by earlier releases join the executor's chain. As a result, `Entity.CurrentAddress` inside `execute` no longer identifies the scheduled time; use the new `ClusterCron.CurrentScheduledTime` service instead, which is available in both modes.

Failed runs are still retried until they succeed or are older than `skipIfOlderThan`, but in this mode a failing run now blocks later runs while it is retried, instead of later runs executing alongside it.
