---
"effect": patch
---

Log and retry failures when scheduling the initial ClusterCron run so transient failures no longer leave the cron stopped.
