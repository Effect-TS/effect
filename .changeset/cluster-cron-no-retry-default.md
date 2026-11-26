---
"effect": patch
---

`ClusterCron` no longer retries failed runs in the default scheduling mode, and with `calculateNextRunFromPrevious` it retries them in place on every runtime, with backoff capped at one minute.
