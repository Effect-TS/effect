---
"effect": patch
---

Fix `ClusterCron` with `calculateNextRunFromPrevious: true` not resuming after its pending run was lost, by seeding the initial run at the next run's time instead of a fixed `initial` entity id.
