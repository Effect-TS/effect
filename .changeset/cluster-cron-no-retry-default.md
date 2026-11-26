---
"effect": patch
---

`ClusterCron` no longer retries a failed run in the default scheduling mode, and with `calculateNextRunFromPrevious` it now retries failed runs on every runtime, backing off up to one minute.
