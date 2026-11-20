---
"effect": patch
---

Add `ClusterCron.CronSchedule`, a `Context.Service` holding a cron job's effective `cron`, `calculateNextRunFromPrevious` and `skipIfOlderThan`. `ClusterCron.make` provides it to `execute` and attaches it as an annotation on the registered cron entity.
